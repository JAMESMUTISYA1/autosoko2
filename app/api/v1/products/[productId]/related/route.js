// PATH: app/api/v1/products/[productId]/related/route.js

import { db } from "@/lib/db";
import { getRelatedProducts } from "@/lib/publicProducts";

// GET /api/v1/products/:productId/related?type=store|category — public.
// Re-checks the same visibility rule as the detail route (active product,
// active/non-deleted business) before trusting businessId/categoryId off
// this id, so this can never be used to fish out related items for a
// product that shouldn't be publicly visible in the first place.
export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "category" ? "category" : "store";

  const product = await db.product.findFirst({
    where: { id: params.productId, deletedAt: null, status: "active", business: { deletedAt: null, status: "active" } },
    select: { id: true, businessId: true, categoryId: true },
  });
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  const related = await getRelatedProducts(product, type);
  return Response.json({ success: true, data: related });
}