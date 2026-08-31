import { db } from "@/lib/db";

// Returns the product only if it belongs to this business and isn't
// soft-deleted — null otherwise. Callers should return a 404 (not 403) on
// null, so a seller probing another business's product id learns nothing.
export async function getOwnedProduct(productId, businessId) {
  return db.product.findFirst({ where: { id: productId, businessId, deletedAt: null } });
}