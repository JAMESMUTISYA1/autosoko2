import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/adminGuard";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const products = await db.product.findMany({
    where: { businessId: params.businessId, deletedAt: null },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ success: true, data: products });
}

// POST — kept intentionally close to the shape your existing
// ProductFormModal already sends, just scoped to :businessId instead of a
// hardcoded "autosoko" slug.
export async function POST(request, { params }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const business = await db.business.findUnique({ where: { id: params.businessId } });
  if (!business) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  }

  const body = await request.json();
  if (!body.name || !body.categoryId || body.priceMinor === undefined) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "name, categoryId, and priceMinor are required" } },
      { status: 400 }
    );
  }

  const slug = body.name.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  const product = await db.product.create({
    data: {
      businessId: params.businessId,
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
      sponsored: Boolean(body.sponsored),
      compatibility: body.compatibleTrims?.length
        ? { create: body.compatibleTrims.map((trimId) => ({ vehicleTrimId: trimId })) }
        : undefined,
    },
  });

  await writeAuditLog({
    actorId: guard.adminId, action: "product.created", entityType: "Product",
    entityId: product.id, after: product, request,
  });

  return Response.json({ success: true, data: product }, { status: 201 });
}