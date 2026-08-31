import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/sellerGuard";
import { getOwnedProduct } from "@/lib/productOwnership";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const existing = await db.productVehicleCompatibility.findUnique({
    where: { productId_vehicleTrimId: { productId: params.productId, vehicleTrimId: params.trimId } },
  });
  if (!existing) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Not linked" } }, { status: 404 });
  }

  await db.productVehicleCompatibility.delete({
    where: { productId_vehicleTrimId: { productId: params.productId, vehicleTrimId: params.trimId } },
  });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_compatibility.removed_by_seller", entityType: "Product",
    entityId: params.productId, before: existing, request,
  });

  return Response.json({ success: true });
}