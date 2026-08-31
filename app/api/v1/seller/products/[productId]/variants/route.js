import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getOwnedProduct } from "@/lib/productOwnership";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const { sku, priceMinorOverride, stockQuantity, attributes } = await request.json();
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes) || Object.keys(attributes).length === 0) {
    return Response.json(
      { success: false, error: { code: "VALIDATION", message: "attributes (e.g. { color: 'Red', size: 'L' }) is required" } },
      { status: 400 }
    );
  }

  const variant = await db.productVariant.create({
    data: {
      productId: params.productId,
      sku: sku || null,
      priceMinorOverride: priceMinorOverride || null,
      stockQuantity: stockQuantity || 0,
      attributes,
    },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_variant.added_by_seller", entityType: "Product",
    entityId: params.productId, after: variant, request,
  });

  return Response.json({ success: true, data: variant }, { status: 201 });
}