import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { writeAuditLog } from "@/lib/audit";
import { getOwnedProduct } from "@/lib/productOwnership";

const DETAIL_INCLUDE = {
  images: { orderBy: { sortOrder: "asc" } },
  variants: true,
  documents: true,
  category: { select: { id: true, name: true } },
  compatibility: {
    include: {
      vehicleTrim: {
        select: {
          id: true,
          name: true,
          generation: {
            select: {
              id: true, name: true, yearStart: true, yearEnd: true,
              model: { select: { id: true, name: true, make: { select: { id: true, name: true } } } },
            },
          },
        },
      },
    },
  },
};

export async function GET(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await db.product.findFirst({
    where: { id: params.productId, businessId: guard.businessId, deletedAt: null },
    include: DETAIL_INCLUDE,
  });
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }
  return Response.json({ success: true, data: product });
}

export async function PATCH(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const before = await getOwnedProduct(params.productId, guard.businessId);
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const body = await request.json();
  // Whitelist — businessId, slug, and sponsored are deliberately excluded.
  // A seller can't move a product to another business, and can't flip
  // `sponsored` on themselves (see the comment in the create route).
  const {
    name, categoryId, shortDescription, longDescription, brand, manufacturer,
    oemNumber, partNumber, sku, barcode, priceMinor, wholesalePriceMinor,
    moq, stockQuantity, trackInventory, condition, warrantyMonths,
    weightGrams, lengthMm, widthMm, heightMm, status, youtubeUrl,
    fittingInstructions, toolsNeeded,
  } = body;

  if (categoryId) {
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return Response.json({ success: false, error: { code: "VALIDATION", message: "Unknown categoryId" } }, { status: 400 });
    }
  }

  const product = await db.product.update({
    where: { id: params.productId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(shortDescription !== undefined ? { shortDescription } : {}),
      ...(longDescription !== undefined ? { longDescription } : {}),
      ...(brand !== undefined ? { brand } : {}),
      ...(manufacturer !== undefined ? { manufacturer } : {}),
      ...(oemNumber !== undefined ? { oemNumber } : {}),
      ...(partNumber !== undefined ? { partNumber } : {}),
      ...(sku !== undefined ? { sku } : {}),
      ...(barcode !== undefined ? { barcode } : {}),
      ...(priceMinor !== undefined ? { priceMinor } : {}),
      ...(wholesalePriceMinor !== undefined ? { wholesalePriceMinor } : {}),
      ...(moq !== undefined ? { moq } : {}),
      ...(stockQuantity !== undefined ? { stockQuantity } : {}),
      ...(trackInventory !== undefined ? { trackInventory } : {}),
      ...(condition !== undefined ? { condition } : {}),
      ...(warrantyMonths !== undefined ? { warrantyMonths } : {}),
      ...(weightGrams !== undefined ? { weightGrams } : {}),
      ...(lengthMm !== undefined ? { lengthMm } : {}),
      ...(widthMm !== undefined ? { widthMm } : {}),
      ...(heightMm !== undefined ? { heightMm } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(youtubeUrl !== undefined ? { youtubeUrl } : {}),
      ...(fittingInstructions !== undefined ? { fittingInstructions } : {}),
      ...(toolsNeeded !== undefined ? { toolsNeeded } : {}),
    },
    include: DETAIL_INCLUDE,
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product.updated_by_seller", entityType: "Product",
    entityId: product.id, before, after: product, request,
  });

  return Response.json({ success: true, data: product });
}

export async function DELETE(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const before = await getOwnedProduct(params.productId, guard.businessId);
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const product = await db.product.update({
    where: { id: params.productId },
    data: { deletedAt: new Date(), status: "archived" },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product.deleted_by_seller", entityType: "Product",
    entityId: product.id, before, request,
  });

  return Response.json({ success: true });
}