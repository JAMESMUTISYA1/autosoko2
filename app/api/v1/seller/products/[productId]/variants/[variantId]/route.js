import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getOwnedProduct } from "@/lib/productOwnership";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const before = await db.productVariant.findFirst({ where: { id: params.variantId, productId: params.productId } });
  if (!before) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Variant not found" } }, { status: 404 });
  }

  const { sku, priceMinorOverride, stockQuantity, attributes } = await request.json();

  const variant = await db.productVariant.update({
    where: { id: params.variantId },
    data: {
      ...(sku !== undefined ? { sku } : {}),
      ...(priceMinorOverride !== undefined ? { priceMinorOverride } : {}),
      ...(stockQuantity !== undefined ? { stockQuantity } : {}),
      ...(attributes !== undefined ? { attributes } : {}),
    },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_variant.updated_by_seller", entityType: "Product",
    entityId: params.productId, before, after: variant, request,
  });

  return Response.json({ success: true, data: variant });
}

export async function DELETE(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const variant = await db.productVariant.findFirst({ where: { id: params.variantId, productId: params.productId } });
  if (!variant) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Variant not found" } }, { status: 404 });
  }

  await db.productVariant.delete({ where: { id: params.variantId } });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_variant.removed_by_seller", entityType: "Product",
    entityId: params.productId, before: variant, request,
  });

  return Response.json({ success: true });
}