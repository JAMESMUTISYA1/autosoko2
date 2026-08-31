import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { uniqueProductSlug } from "@/lib/slug";

export async function GET(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search")?.trim();

  const where = {
    businessId: guard.businessId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { partNumber: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        category: { select: { id: true, name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return Response.json({
    success: true,
    data: products,
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

export async function POST(request) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const body = await request.json();
  if (!body.name || !body.categoryId || body.priceMinor === undefined) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "name, categoryId, and priceMinor are required" } },
      { status: 400 }
    );
  }

  const category = await db.category.findUnique({ where: { id: body.categoryId } });
  if (!category) {
    return Response.json({ success: false, error: { code: "VALIDATION", message: "Unknown categoryId" } }, { status: 400 });
  }

  const slug = await uniqueProductSlug(guard.businessId, body.name);

  const product = await db.product.create({
    data: {
      businessId: guard.businessId,
      categoryId: body.categoryId,
      name: body.name,
      slug,
      shortDescription: body.shortDescription || null,
      longDescription: body.longDescription || null,
      brand: body.brand || null,
      manufacturer: body.manufacturer || null,
      oemNumber: body.oemNumber || null,
      partNumber: body.partNumber || null,
      sku: body.sku || null,
      barcode: body.barcode || null,
      priceMinor: body.priceMinor,
      wholesalePriceMinor: body.wholesalePriceMinor || null,
      moq: body.moq || 1,
      stockQuantity: body.stockQuantity || 0,
      trackInventory: body.trackInventory ?? true,
      condition: body.condition || "new",
      warrantyMonths: body.warrantyMonths || null,
      weightGrams: body.weightGrams || null,
      lengthMm: body.lengthMm || null,
      widthMm: body.widthMm || null,
      heightMm: body.heightMm || null,
      status: body.status || "draft",
      youtubeUrl: body.youtubeUrl || null,
      fittingInstructions: body.fittingInstructions || null,
      toolsNeeded: body.toolsNeeded || null,
      // Sellers can never self-sponsor — sponsorship is a paid feature
      // that goes through the Sponsorship flow (or admin), not a free
      // checkbox on the listing form. Any `sponsored` value in the body
      // is ignored on purpose.
      sponsored: false,
      compatibility: body.compatibleTrims?.length
        ? { create: body.compatibleTrims.map((trimId) => ({ vehicleTrimId: trimId })) }
        : undefined,
    },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product.created_by_seller", entityType: "Product",
    entityId: product.id, after: product, request,
  });

  return Response.json({ success: true, data: product }, { status: 201 });
}