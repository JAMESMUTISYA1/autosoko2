// PATH: app/api/v1/products/[productId]/route.js

import { getPublicProductDetail, incrementProductViewCount } from "@/lib/publicProducts";

// GET /api/v1/products/:productId — public, no auth. This is the REST
// equivalent of what app/product/[productId]/page.js fetches directly via
// Prisma for its own render; this route exists for any OTHER consumer
// (mobile app, client-side re-fetch, etc.) that needs the same data over
// HTTP. Each call here counts as its own "view" for viewCount purposes —
// independent of the page's own increment, since this is a genuinely
// separate access path, not a duplicate of the same page load.
export async function GET(request, { params }) {
  const product = await getPublicProductDetail(params.productId);
  if (!product) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
  }

  await incrementProductViewCount(params.productId);

  return Response.json(
    { success: true, data: product },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}