// lib/search/searchEngine.js
import Fuse from "fuse.js";
import { db } from "@/lib/db";
import { isAdvancedQuery, parseQuery, evaluateQuery } from "./queryParser";
import { synonymsOf, expandQueryWithSynonyms } from "./synonyms";
import { buildSpellcheckIndex, suggestQueryCorrection } from "./spellcheck";
import { haversineKm } from "./geo";
import { normalizeText } from "./locale";

// -------------------------------
// Caching (singleton per process, TTL + stale-while-revalidate)
// -------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — tune to your write volume

let searchDocsCache = null;
let storeDocsCache = null;
let mechanicDocsCache = null;
let categoryNameByIdCache = null;
let storeByIdCache = null;

let productIndexAll = null;
let productIndexAny = null;
let storeIndexAll = null;
let storeIndexAny = null;

let productPrefixIndex = null;
let storePrefixIndex = null;
let mechanicPrefixIndex = null;

let tokenFrequency = null; // Map<token, count> across products, feeds spell-check
let spellcheckIndex = null;

let lastLoadedAt = 0;
let loadingPromise = null;

// -------------------------------
// Constants
// -------------------------------
const STORE_MATCH_CONFIDENCE = 0.3;
const SPONSORED_RELEVANCE_FLOOR = 0.12;
const MAX_RELEVANT_SCORE = 0.72;
const AUTOCOMPLETE_PREFIX_MAX_TOKENS = 60;

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

const PRODUCT_PREFIX_FIELDS = ["name", "brand", "sku", "oemNumber", "partNumber", "storeName"];
const STORE_PREFIX_FIELDS = ["name", "location"];
const MECHANIC_PREFIX_FIELDS = ["name", "specialtiesText"];

// -------------------------------
// Tokenization + prefix index
// -------------------------------
function tokenize(value) {
  if (!value) return [];
  // Diacritic-insensitive: normalizeText strips accents before we split
  // into tokens, so this same function makes both index-building (what
  // gets stored) and query-time lookups (what gets searched) agree —
  // "café" and "cafe" tokenize identically either direction.
  return normalizeText(String(value)).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
}

function buildPrefixIndex(docs, fields) {
  const tokenMap = new Map();
  docs.forEach((doc, idx) => {
    for (const field of fields) {
      for (const token of tokenize(doc[field])) {
        if (!tokenMap.has(token)) tokenMap.set(token, new Set());
        tokenMap.get(token).add(idx);
      }
    }
  });
  const sortedTokens = Array.from(tokenMap.keys()).sort();
  return { tokenMap, sortedTokens };
}

function buildTokenFrequency(docs, fields) {
  const freq = new Map();
  docs.forEach((doc) => {
    for (const field of fields) {
      for (const token of tokenize(doc[field])) {
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    }
  });
  return freq;
}

function lowerBound(sortedArr, target) {
  let lo = 0;
  let hi = sortedArr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedArr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function prefixMatchIds({ tokenMap, sortedTokens }, prefix) {
  const ids = new Set();
  if (!prefix) return ids;
  let i = lowerBound(sortedTokens, prefix);
  let scanned = 0;
  while (
    i < sortedTokens.length &&
    sortedTokens[i].startsWith(prefix) &&
    scanned < AUTOCOMPLETE_PREFIX_MAX_TOKENS
  ) {
    for (const id of tokenMap.get(sortedTokens[i])) ids.add(id);
    i++;
    scanned++;
  }
  return ids;
}

function prefixSearch(index, query, docs, limit) {
  const words = tokenize(query);
  if (words.length === 0) return [];

  const candidateSets = words.map((word, i) => {
    const isLast = i === words.length - 1;
    return isLast ? prefixMatchIds(index, word) : index.tokenMap.get(word) || new Set();
  });

  let result = candidateSets[0];
  for (let i = 1; i < candidateSets.length; i++) {
    result = new Set([...result].filter((id) => candidateSets[i].has(id)));
    if (result.size === 0) break;
  }

  return Array.from(result)
    .slice(0, limit * 4)
    .map((idx) => docs[idx]);
}

// -------------------------------
// Data loading & index building
// -------------------------------
async function loadFromDb() {
  const [products, categories, stores, mechanics] = await Promise.all([
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
        status: true,
        ratingAvg: true,
        ratingCount: true,
        latitude: true,
        longitude: true,
        town: { select: { name: true } },
      },
    }),
    db.mechanic.findMany({
      select: {
        id: true,
        name: true,
        specialties: true,
        ratingAvg: true,
        ratingCount: true,
        verified: true,
        mobileAvailable: true,
        townId: true,
        town: { select: { name: true } },
      },
    }),
  ]);

  const categoryNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));

  const searchDocs = products.map((p) => {
    const store = storeById[p.businessId];
    return {
      ...p,
      categoryName: categoryNameById[p.categoryId] || "",
      storeName: store?.name || "",
      storeVerified: store?.verificationStatus === "verified",
      sellerName: store?.name || "",
      sellerVerified: store?.verificationStatus === "verified",
      location: store?.town?.name || "",
      storeStatus: store?.status || "active",
      storeLat: store?.latitude ?? null,
      storeLng: store?.longitude ?? null,
      rating: store?.ratingAvg || 0,
      ratingCount: store?.ratingCount || 0,
      unitsSold: 0,
      images: p.images?.map((img) => img.url),
    };
  });

  const storeDocs = stores.map((s) => ({
    ...s,
    location: s.town?.name || "",
  }));

  const mechanicDocs = mechanics.map((m) => ({
    ...m,
    location: m.town?.name || "",
    specialtiesText: Array.isArray(m.specialties) ? m.specialties.join(" ") : "",
  }));

  return { searchDocs, storeDocs, mechanicDocs, categoryNameById, storeById };
}

async function rebuildIndices() {
  const { searchDocs, storeDocs, mechanicDocs, categoryNameById, storeById } = await loadFromDb();

  searchDocsCache = searchDocs;
  storeDocsCache = storeDocs;
  mechanicDocsCache = mechanicDocs;
  categoryNameByIdCache = categoryNameById;
  storeByIdCache = storeById;

  productIndexAll = new Fuse(searchDocs, { ...BASE_OPTIONS, keys: PRODUCT_KEYS, tokenMatch: "all" });
  productIndexAny = new Fuse(searchDocs, { ...BASE_OPTIONS, keys: PRODUCT_KEYS, tokenMatch: "any" });
  storeIndexAll = new Fuse(storeDocs, { ...BASE_OPTIONS, keys: STORE_KEYS, tokenMatch: "all" });
  storeIndexAny = new Fuse(storeDocs, { ...BASE_OPTIONS, keys: STORE_KEYS, tokenMatch: "any" });

  productPrefixIndex = buildPrefixIndex(searchDocs, PRODUCT_PREFIX_FIELDS);
  storePrefixIndex = buildPrefixIndex(storeDocs, STORE_PREFIX_FIELDS);
  mechanicPrefixIndex = buildPrefixIndex(mechanicDocs, MECHANIC_PREFIX_FIELDS);

  tokenFrequency = buildTokenFrequency(searchDocs, PRODUCT_PREFIX_FIELDS);
  spellcheckIndex = buildSpellcheckIndex(tokenFrequency);

  lastLoadedAt = Date.now();
}

async function ensureDataLoaded() {
  const isStale = Date.now() - lastLoadedAt > CACHE_TTL_MS;

  if (!searchDocsCache) {
    if (!loadingPromise) {
      loadingPromise = rebuildIndices().finally(() => {
        loadingPromise = null;
      });
    }
    await loadingPromise;
    return;
  }

  if (isStale && !loadingPromise) {
    loadingPromise = rebuildIndices()
      .catch((err) => {
        console.error("[searchEngine] background refresh failed, serving stale cache:", err);
      })
      .finally(() => {
        loadingPromise = null;
      });
  }
}

export async function warmSearchCache() {
  await ensureDataLoaded();
}

async function fuzzyProductSearch(query, limit = 50) {
  await ensureDataLoaded();
  if (!query || !query.trim()) return [];
  const strict = productIndexAll.search(query, { limit }).filter((r) => r.score <= MAX_RELEVANT_SCORE);
  if (strict.length > 0) return strict;
  return productIndexAny.search(query, { limit }).filter((r) => r.score <= MAX_RELEVANT_SCORE);
}

async function fuzzyStoreSearch(query, limit = 20) {
  await ensureDataLoaded();
  if (!query || !query.trim()) return [];
  const strict = storeIndexAll.search(query, { limit }).filter((r) => r.score <= MAX_RELEVANT_SCORE);
  if (strict.length > 0) return strict;
  return storeIndexAny.search(query, { limit }).filter((r) => r.score <= MAX_RELEVANT_SCORE);
}

// -------------------------------
// Synonym-expanded fuzzy search
// -------------------------------
// Runs the existing fuzzy pipeline once per synonym-substituted variant
// of the query and merges results, keeping the best (lowest) score per
// doc. The literal query is always variant #1, so its own matches win
// ties against a synonym-only match.
async function synonymAwareProductSearch(query, limit = 500) {
  const variants = expandQueryWithSynonyms(query);
  const bestByDocId = new Map();
  for (const variant of variants) {
    const hits = await fuzzyProductSearch(variant, limit);
    for (const hit of hits) {
      const existing = bestByDocId.get(hit.item.id);
      if (!existing || hit.score < existing.score) bestByDocId.set(hit.item.id, hit);
    }
  }
  return Array.from(bestByDocId.values());
}

// -------------------------------
// Boolean/phrase/field query search
// -------------------------------
function booleanProductSearch(query, docs) {
  const ast = parseQuery(query);
  const results = [];
  for (const doc of docs) {
    const { matched, relevance } = evaluateQuery(ast, doc, { synonymsOf });
    if (matched && relevance > 0) results.push({ doc, relevance });
  }
  return results;
}

// -------------------------------
// Scoring & filtering helpers
// -------------------------------
function maxOf(arr, fn) {
  return arr.reduce((max, item) => Math.max(max, fn(item)), 0);
}

function scoreResult(doc, relevance, maxUnitsSold) {
  let score = relevance * 0.75;
  if (doc.sponsored && relevance >= SPONSORED_RELEVANCE_FLOOR) score += 0.14;
  if (doc.sellerVerified) score += 0.03;
  score += (doc.rating / 5) * 0.04;
  if (maxUnitsSold > 0) {
    score += (Math.log10(doc.unitsSold + 1) / Math.log10(maxUnitsSold + 1)) * 0.04;
  }
  return score;
}

function matchesFilters(doc, filters) {
  // Baseline hygiene — always on, not a param. A suspended/banned seller's
  // listings shouldn't surface in search regardless of what the caller
  // asks for; this isn't "safe search" in the explicit-content sense
  // (the schema has no content-moderation flags on products), it's the
  // closest real trust signal available: don't show inventory from
  // sellers the platform has already taken action against.
  if (doc.storeStatus === "suspended" || doc.storeStatus === "banned") return false;

  if (filters.categoryId && doc.categoryId !== filters.categoryId) return false;
  if (filters.condition && doc.condition !== filters.condition) return false;
  if (filters.verifiedOnly && !doc.sellerVerified) return false;
  if (filters.storeId && doc.businessId !== filters.storeId) return false;
  if (filters.priceMin != null && doc.priceMinor < filters.priceMin) return false;
  if (filters.priceMax != null && doc.priceMinor > filters.priceMax) return false;
  if (filters.brand && doc.brand?.toLowerCase() !== filters.brand.toLowerCase()) return false;
  if (filters.location && doc.location?.toLowerCase() !== filters.location.toLowerCase()) return false;
  // Opt-in strict mode: requires seller verification, distinct from
  // `verifiedOnly` above so a caller can turn on "safe search" as a
  // single toggle without it being confused with the existing verified
  // filter chip in the UI.
  if (filters.safeSearchOnly && !doc.sellerVerified) return false;
  return true;
}

function vehicleMakeBoost(doc, make) {
  if (!make) return 0;
  return doc.name.toLowerCase().includes(make.toLowerCase()) ? 0.08 : 0;
}

// Personalization is deliberately stateless on the server: no click
// tracking, no stored search history. The caller (client) passes in
// whatever recent categories/brands it wants considered — e.g. from
// local component state or localStorage — and can opt out entirely by
// omitting the param or passing `enabled: false`. Nothing here persists
// beyond the single request.
function personalizationBoost(doc, personalize) {
  if (!personalize || personalize.enabled === false) return 0;
  let boost = 0;
  if (personalize.recentCategoryIds?.includes(doc.categoryId)) boost += 0.05;
  if (personalize.recentBrands?.some((b) => b?.toLowerCase() === doc.brand?.toLowerCase())) boost += 0.03;
  return boost;
}

function buildFacets(docs) {
  const conditionCounts = {};
  const categoryCounts = {};
  const brandCounts = {};
  const locationCounts = {};
  for (const d of docs) {
    conditionCounts[d.condition] = (conditionCounts[d.condition] || 0) + 1;
    categoryCounts[d.categoryName] = (categoryCounts[d.categoryName] || 0) + 1;
    if (d.brand) brandCounts[d.brand] = (brandCounts[d.brand] || 0) + 1;
    if (d.location) locationCounts[d.location] = (locationCounts[d.location] || 0) + 1;
  }
  return { condition: conditionCounts, category: categoryCounts, brand: brandCounts, location: locationCounts };
}

function sortResults(scored, sort, geo) {
  switch (sort) {
    case "price_asc":
      return scored.sort((a, b) => a.doc.priceMinor - b.doc.priceMinor);
    case "price_desc":
      return scored.sort((a, b) => b.doc.priceMinor - a.doc.priceMinor);
    case "rating":
      return scored.sort((a, b) => b.doc.rating - a.doc.rating);
    case "newest":
      return scored.sort((a, b) => b.doc.createdAt.localeCompare(a.doc.createdAt));
    case "popularity":
      return scored.sort((a, b) => (b.doc.unitsSold || 0) - (a.doc.unitsSold || 0));
    case "distance":
      if (geo?.lat == null || geo?.lng == null) {
        // No user location provided — distance sort is meaningless
        // without it, so fall back to relevance rather than silently
        // returning an effectively-random order.
        return scored.sort((a, b) => b.finalScore - a.finalScore);
      }
      return scored.sort(
        (a, b) =>
          haversineKm(geo.lat, geo.lng, a.doc.storeLat, a.doc.storeLng) -
          haversineKm(geo.lat, geo.lng, b.doc.storeLat, b.doc.storeLng)
      );
    case "nearby": {
      // Distinct from "distance": pure distance sort can surface an
      // irrelevant product just because the seller happens to be next
      // door. "Nearby" blends relevance and proximity — good match AND
      // close by beats mediocre match that's slightly closer.
      if (geo?.lat == null || geo?.lng == null) {
        return scored.sort((a, b) => b.finalScore - a.finalScore);
      }
      const distances = scored.map((s) => haversineKm(geo.lat, geo.lng, s.doc.storeLat, s.doc.storeLng));
      const finiteDistances = distances.filter((d) => Number.isFinite(d));
      const maxDist = finiteDistances.length ? Math.max(...finiteDistances) : 0;
      const blended = scored.map((s, i) => {
        const d = distances[i];
        const proximity = Number.isFinite(d) && maxDist > 0 ? 1 - d / maxDist : 0;
        return { ...s, _nearbyScore: s.finalScore * 0.6 + proximity * 0.4 };
      });
      return blended.sort((a, b) => b._nearbyScore - a._nearbyScore);
    }
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
  brand = "",
  location = "",
  make = "",
  sort = "relevance",
  limit = 24,
  offset = 0,
  userLat = null,
  userLng = null,
  safeSearchOnly = false,
  personalize = null,
} = {}) {
  try {
    await ensureDataLoaded();

    const query = q.trim();
    const filters = { categoryId, condition, priceMin, priceMax, verifiedOnly, storeId, brand, location, safeSearchOnly };
    const advanced = query ? isAdvancedQuery(query) : false;

    let storeMatch = null;
    if (query && !advanced) {
      const storeHits = await fuzzyStoreSearch(query);
      if (storeHits.length > 0 && storeHits[0].score <= STORE_MATCH_CONFIDENCE) {
        storeMatch = storeHits[0].item;
      }
    }

    let candidates;
    let didYouMean = null;

    if (query && advanced) {
      candidates = booleanProductSearch(query, searchDocsCache).map((c) => ({ ...c, matches: [] }));
    } else if (query) {
      const hits = await synonymAwareProductSearch(query, 500);
      candidates = hits.map((h) => ({ doc: h.item, relevance: 1 - h.score, matches: h.matches }));

      // Spell-check: only worth suggesting when the query is thin on
      // results and we can find a correction that isn't a no-op.
      if (candidates.length < 3) {
        const suggestion = suggestQueryCorrection(query, spellcheckIndex, tokenFrequency);
        if (suggestion && suggestion.toLowerCase() !== query.toLowerCase()) {
          const correctedHits = await synonymAwareProductSearch(suggestion, 500);
          if (correctedHits.length > candidates.length) {
            didYouMean = suggestion;
          }
        }
      }
    } else {
      candidates = searchDocsCache.map((doc) => ({ doc, relevance: 0.5, matches: [] }));
    }

    if (storeMatch) {
      const alreadyIncluded = new Set(candidates.map((c) => c.doc.id));
      for (const doc of searchDocsCache) {
        if (doc.businessId === storeMatch.id && !alreadyIncluded.has(doc.id)) {
          candidates.push({ doc, relevance: 0.4, matches: [] });
        }
      }
    }

    candidates = candidates.filter((c) => matchesFilters(c.doc, filters));

    const maxUnitsSold = maxOf(candidates, (c) => c.doc.unitsSold || 0);
    let scored = candidates.map((c) => ({
      ...c,
      finalScore:
        scoreResult(c.doc, c.relevance, maxUnitsSold) +
        vehicleMakeBoost(c.doc, make) +
        personalizationBoost(c.doc, personalize),
    }));
    scored = sortResults(scored, sort, { lat: userLat, lng: userLng });

    const estimatedTotal = scored.length;
    const page = scored.slice(offset, offset + limit);
    const facets = buildFacets(scored.map((s) => s.doc));

    // Query transparency: exactly what was applied, so a UI can render
    // an "active filters" strip and the person can see/remove them.
    const appliedFilters = Object.fromEntries(
      Object.entries({
        categoryId,
        condition,
        priceMin,
        priceMax,
        verifiedOnly,
        storeId,
        brand,
        location,
        make,
        safeSearchOnly,
        personalized: !!(personalize && personalize.enabled !== false),
      }).filter(([, v]) => v != null && v !== "" && v !== false)
    );

    return {
      results: page.map((s) => ({ ...s.doc, _matches: s.matches })),
      storeMatch,
      facets,
      estimatedTotal,
      query,
      limit,
      offset,
      sort,
      appliedFilters,
      parsedAsAdvancedQuery: advanced,
      didYouMean,
    };
  } catch (err) {
    console.error("[searchEngine] runSearch failed:", err);
    return {
      results: [],
      storeMatch: null,
      facets: { condition: {}, category: {}, brand: {}, location: {} },
      estimatedTotal: 0,
      query: q,
      limit,
      offset,
      sort,
      appliedFilters: {},
      parsedAsAdvancedQuery: false,
      didYouMean: null,
      error: true,
    };
  }
}

// -------------------------------
// Autocomplete — prefix-first, fuzzy fallback
// -------------------------------
function rankAutocomplete(docs, query, opts) {
  const q = query.toLowerCase();
  return docs
    .map((doc) => {
      const name = (doc.name || "").toLowerCase();
      let score = name.startsWith(q) ? 0.6 : name.includes(q) ? 0.35 : 0.2;
      if (opts.sponsoredBoost && doc.sponsored) score += 0.2;
      if (opts.verifiedBoost && (doc.sellerVerified ?? doc.verified)) score += 0.1;
      score += ((doc.rating ?? doc.ratingAvg ?? 0) / 5) * 0.05;
      return { doc, score };
    })
    .sort((a, b) => b.score - a.score);
}

export async function autocomplete(q, limit = 6) {
  try {
    await ensureDataLoaded();
    const query = q.trim();
    if (!query) return { products: [], stores: [], mechanics: [] };

    let productMatches = prefixSearch(productPrefixIndex, query, searchDocsCache, limit);
    let storeMatches = prefixSearch(storePrefixIndex, query, storeDocsCache, 3);
    let mechanicMatches = prefixSearch(mechanicPrefixIndex, query, mechanicDocsCache, 3);

    if (productMatches.length < limit) {
      const fuzzy = (await fuzzyProductSearch(query, limit)).map((h) => h.item);
      const seen = new Set(productMatches.map((d) => d.id));
      for (const doc of fuzzy) {
        if (!seen.has(doc.id)) {
          productMatches.push(doc);
          seen.add(doc.id);
        }
      }
    }
    if (storeMatches.length === 0) {
      storeMatches = (await fuzzyStoreSearch(query, 3)).map((h) => h.item);
    }

    const rankedProducts = rankAutocomplete(productMatches, query, { sponsoredBoost: true, verifiedBoost: true }).slice(0, limit);
    const rankedStores = rankAutocomplete(storeMatches, query, { verifiedBoost: true }).slice(0, 3);
    const rankedMechanics = rankAutocomplete(mechanicMatches, query, { verifiedBoost: true }).slice(0, 3);

    return {
      products: rankedProducts.map(({ doc }) => ({
        id: doc.id,
        slug: doc.slug,
        name: doc.name,
        image: doc.images?.[0],
        priceMinor: doc.priceMinor,
        currency: doc.currency,
      })),
      stores: rankedStores.map(({ doc }) => ({ id: doc.id, slug: doc.slug, name: doc.name })),
      mechanics: rankedMechanics.map(({ doc }) => ({
        id: doc.id,
        name: doc.name,
        location: doc.location,
        verified: doc.verified,
      })),
    };
  } catch (err) {
    console.error("[searchEngine] autocomplete failed:", err);
    return { products: [], stores: [], mechanics: [], error: true };
  }
}
