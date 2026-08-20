import Fuse from "fuse.js";
import { featuredProducts, stores, categories } from "@/data/sampleData";

// ---- Search index ----
// This module stands in for Meilisearch (Document 1 §3.2: search is a
// derived index rebuilt from the source of truth, never the source of
// truth itself). Here the "source of truth" is the mock data arrays;
// in production this same shape gets rebuilt from Postgres via the
// BullMQ indexing job described in that document. The query interface
// below (runSearch in queries.js) is written so the API route and
// search page never need to change when that swap happens — only
// this file does.

const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));

// Denormalize category/store name onto each product once, up front, so
// search can match "brakes" or a store name without a live join per query.
function buildSearchDocs() {
  return featuredProducts.map((p) => ({
    ...p,
    categoryName: categoryNameById[p.categoryId] || "",
    storeName: storeById[p.storeId]?.name || p.sellerName,
    storeVerified: storeById[p.storeId]?.verified ?? p.sellerVerified,
  }));
}

const searchDocs = buildSearchDocs();

// Field weights: name matters most, then brand/OEM/part identifiers (a
// mechanic searching an OEM number wants an exact hit to dominate), then
// store name (so "search a particular store" works), then category and
// description as lower-weight fallback signal.
const PRODUCT_KEYS = [
  { name: "name", weight: 0.42 },
  { name: "brand", weight: 0.13 },
  { name: "oemNumber", weight: 0.12 },
  { name: "partNumber", weight: 0.08 },
  { name: "sku", weight: 0.05 },
  { name: "storeName", weight: 0.1 },
  { name: "categoryName", weight: 0.06 },
  { name: "description", weight: 0.04 },
];

const STORE_KEYS = [
  { name: "name", weight: 0.8 },
  { name: "location", weight: 0.2 },
];

const BASE_OPTIONS = {
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true, // don't penalize matches that aren't near the start of a field
  useTokenSearch: true, // per-word fuzzy matching with BM25-style IDF weighting —
  // this is what makes "mazda bumper lip" find "Front Bumper Lip
  // Spoiler — Mazda 3" even though the words are in a different
  // order and none of them are typo'd, and would still find it
  // even with minor typos in any single word.
};

// Two indices per corpus: "all" requires every query word to match
// somewhere (precise — the first thing we try), "any" requires just one
// (lenient — the fallback when the precise pass finds nothing, so a
// query never dead-ends into zero results if a reasonable partial match
// exists). Both are built once per server process; rebuilding a Fuse
// index per request is the single most common way to make a "fast"
// search feature slow.
let productIndexAll = null;
let productIndexAny = null;
let storeIndexAll = null;
let storeIndexAny = null;

function getProductIndex(mode) {
  if (mode === "all") {
    if (!productIndexAll) {
      productIndexAll = new Fuse(searchDocs, {
        ...BASE_OPTIONS,
        keys: PRODUCT_KEYS,
        tokenMatch: "all",
      });
    }
    return productIndexAll;
  }
  if (!productIndexAny) {
    productIndexAny = new Fuse(searchDocs, {
      ...BASE_OPTIONS,
      keys: PRODUCT_KEYS,
      tokenMatch: "any",
    });
  }
  return productIndexAny;
}

function getStoreIndex(mode) {
  if (mode === "all") {
    if (!storeIndexAll) {
      storeIndexAll = new Fuse(stores, {
        ...BASE_OPTIONS,
        keys: STORE_KEYS,
        tokenMatch: "all",
      });
    }
    return storeIndexAll;
  }
  if (!storeIndexAny) {
    storeIndexAny = new Fuse(stores, {
      ...BASE_OPTIONS,
      keys: STORE_KEYS,
      tokenMatch: "any",
    });
  }
  return storeIndexAny;
}

/**
 * Fuzzy product search with automatic precise→lenient fallback, and a
 * manual relevance cutoff. Fuse's `threshold` option does not actually
 * exclude weak matches when `useTokenSearch` is enabled — it still
 * returns every document in the corpus, ranked — so without this filter
 * a 3-letter query like "maz" would return the entire catalog, just
 * ordered with the real matches first. Verified this empirically before
 * relying on it; not documented clearly in Fuse's own docs.
 */
const MAX_RELEVANT_SCORE = 0.72; // Fuse: 0 = perfect match, 1 = worst.
// Calibrated empirically, not guessed: a heavily typo'd 3-word query
// ("braek pads corola") against its correct target scores ~0.68 once
// every weighted field (brand/OEM/part/SKU/description) is populated,
// while genuinely irrelevant matches for short queries score 0.81+
// against the same corpus. 0.72 sits in that gap.

export function fuzzyProductSearch(query) {
  if (!query || !query.trim()) return [];
  const strict = getProductIndex("all")
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
  if (strict.length > 0) return strict;
  return getProductIndex("any")
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
}

export function fuzzyStoreSearch(query) {
  if (!query || !query.trim()) return [];
  const strict = getStoreIndex("all")
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
  if (strict.length > 0) return strict;
  return getStoreIndex("any")
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
}

export { searchDocs, categoryNameById, storeById };
