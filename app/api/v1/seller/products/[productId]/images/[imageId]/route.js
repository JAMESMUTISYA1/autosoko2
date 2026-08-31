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

  const image = await db.productImage.findFirst({ where: { id: params.imageId, productId: params.productId } });
  if (!image) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Image not found" } }, { status: 404 });
  }

  const { isPrimary, sortOrder, altText } = await request.json();

  const updated = await db.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.productImage.updateMany({ where: { productId: params.productId }, data: { isPrimary: false } });
    }
    return tx.productImage.update({
      where: { id: params.imageId },
      data: {
        ...(isPrimary !== undefined ? { isPrimary: Boolean(isPrimary) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
        ...(altText !== undefined ? { altText } : {}),
      },
    });
  });

  return Response.json({ success: true, data: updated });
}

export async function DELETE(request, { params }) {
  const guard = await requireSeller();
  if (!guard.ok) return guard.response;

  const product = await getOwnedProduct(params.productId, guard.businessId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const image = await db.productImage.findFirst({ where: { id: params.imageId, productId: params.productId } });
  if (!image) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Image not found" } }, { status: 404 });
  }

  await db.productImage.delete({ where: { id: params.imageId } });

  // If the primary image was just removed, promote the next one so the
  // product always has a primary image whenever it has any images at all.
  if (image.isPrimary) {
    const next = await db.productImage.findFirst({ where: { productId: params.productId }, orderBy: { sortOrder: "asc" } });
    if (next) await db.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  await writeAuditLog({
    actorId: guard.sellerId, action: "product_image.removed_by_seller", entityType: "Product",
    entityId: params.productId, before: image, request,
  });

  return Response.json({ success: true });
}