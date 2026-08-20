import { NextResponse } from "next/server";
import { runSearch } from "@/lib/search/searchEngine";

// GET /api/search — mirrors Document 3 §5.1 (public, no auth). Server
// Components call runSearch() directly (see the search page) to avoid an
// unnecessary network hop during SSR; this route exists for client-side
// callers — the autocomplete dropdown today, infinite scroll or a future
// client-rendered results view later.
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const result = runSearch({
    q: searchParams.get("q") || "",
    categoryId: searchParams.get("categoryId") || "",
    condition: searchParams.get("condition") || "",
    priceMin: searchParams.get("priceMin") ? Number(searchParams.get("priceMin")) : null,
    priceMax: searchParams.get("priceMax") ? Number(searchParams.get("priceMax")) : null,
    verifiedOnly: searchParams.get("verified") === "true",
    storeId: searchParams.get("storeId") || "",
    make: searchParams.get("make") || "",
    sort: searchParams.get("sort") || "relevance",
  });

  return NextResponse.json({
    success: true,
    data: result.results,
    meta: {
      estimatedTotal: result.estimatedTotal,
      facets: result.facets,
      storeMatch: result.storeMatch
        ? { id: result.storeMatch.id, slug: result.storeMatch.slug, name: result.storeMatch.name }
        : null,
    },
  });
}
