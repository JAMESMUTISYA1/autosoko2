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

  const doc = await db.productDocument.findFirst({ where: { id: params.documentId, productId: params.productId } });
  if (!doc) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Document not found" } }, { status: 404 });
  }

  await db.productDocument.delete({ where: { id: params.documentId } });

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_document.removed_by_seller", entityType: "Product",
    entityId: params.productId, before: doc, request,
  });

  return Response.json({ success: true });
}