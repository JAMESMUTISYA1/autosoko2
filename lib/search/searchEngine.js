import Fuse from "fuse.js";
import { db } from "@/lib/db";

// -------------------------------
// Caching (singleton per process)
// -------------------------------
let productIndexAll = null;
let productIndexAny = null;
let storeIndexAll = null;
let storeIndexAny = null;
let searchDocsCache = null;
let categoryNameByIdCache = null;
let storeByIdCache = null;

// -------------------------------
// Constants (tuned for fuzzy search)
// -------------------------------
const STORE_MATCH_CONFIDENCE = 0.3;
const SPONSORED_RELEVANCE_FLOOR = 0.12;
const MAX_RELEVANT_SCORE = 0.72;

// Field weights (same as original mock)
const PRODUCT_KEYS = [
  { name: "name", weight: 0.42 },
  { name: "brand", weight: 0.13 },
  { name: "oemNumber", weight: 0.12 },
  { name: "partNumber", weight: 0.08 },
  { name: "sku", weight: 0.05 },
  { name: "storeName", weight: 0.1 },
  { name: "categoryName", weight: 0.06 },
  { name: "shortDescription", weight: 0.02 },
  { name: "longDescription", weight: 0.02 },
];

const STORE_KEYS = [
  { name: "name", weight: 0.8 },
  { name: "location", weight: 0.2 },
];

const BASE_OPTIONS = {
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  useTokenSearch: true,
};

// -------------------------------
// Data loading & index building
// -------------------------------
async function ensureDataLoaded() {
  if (searchDocsCache) return; // already loaded

  // Fetch all needed data from Prisma
  const [products, categories, stores] = await Promise.all([
    db.product.findMany({
      where: { status: "active", deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        oemNumber: true,
        partNumber: true,
        sku: true,
        shortDescription: true,
        longDescription: true,
        priceMinor: true,
        currency: true,
        condition: true,
        sponsored: true,
        stockQuantity: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        businessId: true,
        categoryId: true,
        createdAt: true,
      },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, iconUrl: true },
    }),
    db.business.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        verificationStatus: true,
        ratingAvg: true,
        ratingCount: true,
        town: { select: { name: true } },
      },
    }),
  ]);

  // Create lookup maps
  categoryNameByIdCache = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  storeByIdCache = Object.fromEntries(stores.map((s) => [s.id, s]));

  // Denormalize products for search
  searchDocsCache = products.map((p) => {
    const store = storeByIdCache[p.businessId];
    return {
      ...p,
      categoryName: categoryNameByIdCache[p.categoryId] || "",
      storeName: store?.name || "",
      storeVerified: store?.verificationStatus === "verified",
      sellerName: store?.name || "",
      sellerVerified: store?.verificationStatus === "verified",
      location: store?.town?.name || "",
      rating: store?.ratingAvg || 0,
      ratingCount: store?.ratingCount || 0,
      unitsSold: 0, // can be derived later from OrderItem
      images: p.images?.map((img) => img.url),
    };
  });

  // Build Fuse indices
  productIndexAll = new Fuse(searchDocsCache, {
    ...BASE_OPTIONS,
    keys: PRODUCT_KEYS,
    tokenMatch: "all",
  });
  productIndexAny = new Fuse(searchDocsCache, {
    ...BASE_OPTIONS,
    keys: PRODUCT_KEYS,
    tokenMatch: "any",
  });

  const storeDocs = stores.map((s) => ({
    ...s,
    location: s.town?.name || "",
  }));
  storeIndexAll = new Fuse(storeDocs, {
    ...BASE_OPTIONS,
    keys: STORE_KEYS,
    tokenMatch: "all",
  });
  storeIndexAny = new Fuse(storeDocs, {
    ...BASE_OPTIONS,
    keys: STORE_KEYS,
    tokenMatch: "any",
  });
}

async function fuzzyProductSearch(query) {
  await ensureDataLoaded();
  if (!query || !query.trim()) return [];
  const strict = productIndexAll
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
  if (strict.length > 0) return strict;
  return productIndexAny
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
}

async function fuzzyStoreSearch(query) {
  await ensureDataLoaded();
  if (!query || !query.trim()) return [];
  const strict = storeIndexAll
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
  if (strict.length > 0) return strict;
  return storeIndexAny
    .search(query)
    .filter((r) => r.score <= MAX_RELEVANT_SCORE);
}

// -------------------------------
// Scoring & filtering helpers
// -------------------------------
function maxOf(arr, fn) {
  return arr.reduce((max, item) => Math.max(max, fn(item)), 0);
}

function scoreResult(doc, relevance, maxUnitsSold) {
  let score = relevance * 0.75;

  if (doc.sponsored && relevance >= SPONSORED_RELEVANCE_FLOOR) {
    score += 0.14;
  }
  if (doc.sellerVerified) {
    score += 0.03;
  }
  score += (doc.rating / 5) * 0.04;
  if (maxUnitsSold > 0) {
    score += (Math.log10(doc.unitsSold + 1) / Math.log10(maxUnitsSold + 1)) * 0.04;
  }

  return score;
}

function matchesFilters(doc, filters) {
  if (filters.categoryId && doc.categoryId !== filters.categoryId) return false;
  if (filters.condition && doc.condition !== filters.condition) return false;
  if (filters.verifiedOnly && !doc.sellerVerified) return false;
  if (filters.storeId && doc.businessId !== filters.storeId) return false;
  if (filters.priceMin != null && doc.priceMinor < filters.priceMin) return false;
  if (filters.priceMax != null && doc.priceMinor > filters.priceMax) return false;
  return true;
}

function vehicleMakeBoost(doc, make) {
  if (!make) return 0;
  return doc.name.toLowerCase().includes(make.toLowerCase()) ? 0.08 : 0;
}

function buildFacets(docs) {
  const conditionCounts = {};
  const categoryCounts = {};
  for (const d of docs) {
    conditionCounts[d.condition] = (conditionCounts[d.condition] || 0) + 1;
    categoryCounts[d.categoryName] = (categoryCounts[d.categoryName] || 0) + 1;
  }
  return { condition: conditionCounts, category: categoryCounts };
}

function sortResults(scored, sort) {
  switch (sort) {
    case "price_asc":
      return scored.sort((a, b) => a.doc.priceMinor - b.doc.priceMinor);
    case "price_desc":
      return scored.sort((a, b) => b.doc.priceMinor - a.doc.priceMinor);
    case "rating":
      return scored.sort((a, b) => b.doc.rating - a.doc.rating);
    case "newest":
      return scored.sort((a, b) => b.doc.createdAt.localeCompare(a.doc.createdAt));
    case "relevance":
    default:
      return scored.sort((a, b) => b.finalScore - a.finalScore);
  }
}

// -------------------------------
// Main search function
// -------------------------------
export async function runSearch({
  q = "",
  categoryId = "",
  condition = "",
  priceMin = null,
  priceMax = null,
  verifiedOnly = false,
  storeId = "",
  make = "",
  sort = "relevance",
} = {}) {
  await ensureDataLoaded();

  const query = q.trim();
  const filters = { categoryId, condition, priceMin, priceMax, verifiedOnly, storeId };

  // 1. Detect store match
  let storeMatch = null;
  if (query) {
    const storeHits = await fuzzyStoreSearch(query);
    if (storeHits.length > 0 && storeHits[0].score <= STORE_MATCH_CONFIDENCE) {
      storeMatch = storeHits[0].item;
    }
  }

  // 2. Get candidate docs
  let candidates;
  if (query) {
    const hits = await fuzzyProductSearch(query);
    candidates = hits.map((h) => ({ doc: h.item, relevance: 1 - h.score, matches: h.matches }));
  } else {
    candidates = searchDocsCache.map((doc) => ({ doc, relevance: 0.5, matches: [] }));
  }

  // 3. If store match, include all its products
  if (storeMatch) {
    const alreadyIncluded = new Set(candidates.map((c) => c.doc.id));
    for (const doc of searchDocsCache) {
      if (doc.businessId === storeMatch.id && !alreadyIncluded.has(doc.id)) {
        candidates.push({ doc, relevance: 0.4, matches: [] });
      }
    }
  }

  // 4. Hard filters
  candidates = candidates.filter((c) => matchesFilters(c.doc, filters));

  // 5. Score and sort
  const maxUnitsSold = maxOf(candidates, (c) => c.doc.unitsSold || 0);
  let scored = candidates.map((c) => ({
    ...c,
    finalScore: scoreResult(c.doc, c.relevance, maxUnitsSold) + vehicleMakeBoost(c.doc, make),
  }));
  scored = sortResults(scored, sort);

  // 6. Build facets
  const facets = buildFacets(scored.map((s) => s.doc));

  // 7. Return results with Fuse-compatible matches for highlighting
  return {
    results: scored.map((s) => ({
      ...s.doc,
      _matches: s.matches, // Fuse matches array: [{ key, indices, value }]
    })),
    storeMatch,
    facets,
    estimatedTotal: scored.length,
    query,
  };
}

// -------------------------------
// Autocomplete
// -------------------------------
export async function autocomplete(q, limit = 6) {
  await ensureDataLoaded();
  const query = q.trim();
  if (!query) return { products: [], stores: [] };

  const productHits = (await fuzzyProductSearch(query)).slice(0, limit);
  const storeHits = (await fuzzyStoreSearch(query)).slice(0, 3);

  return {
    products: productHits.map((h) => ({
      id: h.item.id,
      slug: h.item.slug,
      name: h.item.name,
      image: h.item.images?.[0],
      priceMinor: h.item.priceMinor,
      currency: h.item.currency,
    })),
    stores: storeHits.map((h) => ({
      id: h.item.id,
      slug: h.item.slug,
      name: h.item.name,
    })),
  };
}