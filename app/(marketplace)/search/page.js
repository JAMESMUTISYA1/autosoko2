import { Store as StoreIcon, ArrowRight } from "lucide-react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import PersonalizeSearchBanner from "@/components/PersonalizeSearchBanner";
import SearchFilters from "@/components/search/SearchFilters";
import SortControl from "@/components/search/SortControl";
import { runSearch } from "@/lib/search/searchEngine";
import { db } from "@/lib/db";

export default async function SearchPage({ searchParams }) {
  // Fetch categories for the filter sidebar
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, iconUrl: true },
  });

  // Run the database-backed search
  const {
    results,
    storeMatch,
    estimatedTotal,
    query,
  } = await runSearch({
    q: searchParams?.q || "",
    categoryId: searchParams?.categoryId || "",
    condition: searchParams?.condition || "",
    priceMin: searchParams?.priceMin ? Number(searchParams.priceMin) : null,
    priceMax: searchParams?.priceMax ? Number(searchParams.priceMax) : null,
    verifiedOnly: searchParams?.verified === "true",
    make: searchParams?.make || "",
    sort: searchParams?.sort || "relevance",
  });

  const sponsored = results.filter((p) => p.sponsored);
  const organic = results.filter((p) => !p.sponsored);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Search summary */}
      <div className="mb-6">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wide">
          Search Results
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="font-display text-2xl text-gray-900 mt-1">
            {query ? `"${query}"` : "All Parts"}
            <span className="text-gray-500 text-base font-body ml-2">
              ({estimatedTotal} results)
            </span>
          </h1>
          {query && (
            <Link
              href="/search"
              className="text-sm text-accent hover:underline mt-1"
            >
              View all parts →
            </Link>
          )}
        </div>
      </div>

      {/* Confident store-name match */}
      {storeMatch && (
        <Link
          href={`/store/${storeMatch.slug}`}
          className="flex items-center justify-between gap-3 border border-gray-300 rounded-md px-4 py-3.5 mb-6 hover:bg-white transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm text-gray-700">
            <StoreIcon size={16} className="text-blue-500" />
            Did you mean the store <strong className="font-medium">{storeMatch.name}</strong>?
            Results below include everything they sell.
          </span>
          <ArrowRight size={16} className="shrink-0 text-gray-700" />
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        <SearchFilters categories={categories} />

        {/* Results */}
        <div>
          <PersonalizeSearchBanner />

          <div className="flex items-center justify-end mb-4">
            <SortControl />
          </div>

          {results.length === 0 ? (
            <div className="border border-gray-300 rounded-md px-5 py-16 text-center">
              <p className="text-sm text-gray-500 mb-1">No results for "{query}"</p>
              <p className="text-xs text-gray-400">
                Try fewer words, check spelling, or browse by category instead.
              </p>
            </div>
          ) : (
            <>
              {sponsored.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Sponsored</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sponsored.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {organic.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}