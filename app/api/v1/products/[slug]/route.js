import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, hasBusinessPermission, unauthorized, forbidden } from "@/lib/auth/rbac";

const updateSchema = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  priceMinor: z.number().int().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active", "out_of_stock", "archived"]).optional(),
  shortDescription: z.string().max(500).optional(),
});

// GET /api/v1/products/:slug — Document 3 §3.2
// Public, but wholesale pricing only shows for authenticated, verified
// business buyers (the B2B pricing gate the API spec calls for).
export async function GET(request, { params }) {
  const product = await db.product.findFirst({
    where: { slug: params.slug, deletedAt: null, status: "active" },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      longDescription: true,
      brand: true,
      manufacturer: true,
      oemNumber: true,
      partNumber: true,
      sku: true,
      priceMinor: true,
      currency: true,
      wholesalePriceMinor: true,
      moq: true,
      stockQuantity: true,
      condition: true,
      warrantyMonths: true,
      youtubeUrl: true,
      fittingInstructions: true,
      toolsNeeded: true,
      viewCount: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, altText: true, isPrimary: true } },
      compatibility: {
        select: {
          yearStart: true,
          yearEnd: true,
          vehicleTrim: {
            select: {
              name: true,
              fuelType: true,
              transmission: true,
              generation: {
                select: {
                  name: true,
                  yearStart: true,
                  yearEnd: true,
                  model: { select: { name: true, make: { select: { name: true } } } },
                },
              },
            },
          },
        },
      },
      business: {
        select: {
          slug: true,
          name: true,
          verificationStatus: true,
          ratingAvg: true,
          ratingCount: true,
          town: { select: { name: true } },
        },
      },
    },
  });

  if (!product) {
    return Response.json(
      { success: false, error: { code: "NOT_FOUND", message: "Product not found" } },
      { status: 404 }
    );
  }

  // Gate wholesale pricing behind a verified business account
  const session = await getSession();
  let showWholesale = false;
  if (session?.user && product.wholesalePriceMinor) {
    const buyerBusiness = await db.business.findFirst({
      where: { ownerUserId: session.user.id, verificationStatus: "verified" },
      select: { id: true },
    });
    showWholesale = Boolean(buyerBusiness);
  }

  const { wholesalePriceMinor, ...publicProduct } = product;

  // Fire-and-forget view count increment
  db.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return Response.json({
    success: true,
    data: {
      ...publicProduct,
      ...(showWholesale ? { wholesalePriceMinor } : {}),
    },
  });
}

// PATCH /api/v1/products/:slug
export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  // Look up product by slug to get its internal ID and businessId
  const product = await db.product.findFirst({
    where: { slug: params.slug },
    select: { id: true, businessId: true },
  });
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  const allowed = await hasBusinessPermission(session.user.id, product.businessId, "products.update");
  if (!allowed) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    const fields = {};
    for (const issue of parsed.error.issues) fields[issue.path[0]] = issue.message;
    return Response.json({ success: false, error: { code: "VALIDATION_ERROR", fields } }, { status: 400 });
  }

  const updated = await db.product.update({
    where: { id: product.id },
    data: parsed.data,
    select: { id: true, slug: true, name: true, status: true, priceMinor: true, stockQuantity: true },
  });

  return Response.json({ success: true, data: updated });
}

// DELETE /api/v1/products/:slug — soft delete
export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session?.user) return unauthorized();

  const product = await db.product.findFirst({
    where: { slug: params.slug },
    select: { id: true, businessId: true },
  });
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  const allowed = await hasBusinessPermission(session.user.id, product.businessId, "products.delete");
  if (!allowed) return forbidden();

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force) {
    const activeOrders = await db.orderItem.findFirst({
      where: { productId: product.id, order: { status: { in: ["pending", "processing"] } } },
    });
    if (activeOrders) {
      return Response.json(
        { success: false, error: { code: "PRODUCT_HAS_PENDING_ORDERS", message: "This product has pending orders. Pass ?force=true to archive anyway." } },
        { status: 409 }
      );
    }
  }

  await db.product.update({ where: { id: product.id }, data: { status: "archived", deletedAt: new Date() } });

  return Response.json({ success: true, data: { id: product.id, deleted: true } });
}