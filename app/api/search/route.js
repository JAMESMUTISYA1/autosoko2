// app/api/search/route.js
import { NextResponse } from "next/server";
import { runSearch } from "@/lib/search/searchEngine";

// GET /api/search — public, no auth. Server Components call runSearch()
// directly to avoid a network hop during SSR; this route is for
// client-side callers (autocomplete dropdown, infinite scroll, etc).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(Number(searchParams.get("limit")) || 24, 100); // hard cap
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const result = await runSearch({
      q: searchParams.get("q") || "",
      categoryId: searchParams.get("categoryId") || "",
      condition: searchParams.get("condition") || "",
      priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
      priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
      verifiedOnly: searchParams.get("verified") === "true",
      storeId: searchParams.get("storeId") || "",
      make: searchParams.get("make") || "",
      sort: searchParams.get("sort") || "relevance",
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.results,
      meta: {
        estimatedTotal: result.estimatedTotal,
        limit: result.limit,
        offset: result.offset,
        facets: result.facets,
        storeMatch: result.storeMatch
          ? { id: result.storeMatch.id, slug: result.storeMatch.slug, name: result.storeMatch.name }
          : null,
      },
    });
  } catch (err) {
    console.error("[api/search] unhandled error:", err);
    return NextResponse.json({ success: false, error: "Search temporarily unavailable" }, { status: 500 });
  }
}
