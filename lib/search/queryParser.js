// Simple query parser for search engine.
// For now, treat all queries as not advanced; this can be expanded later.

export function isAdvancedQuery(query) {
  return false; // no advanced syntax support yet
}

export function parseQuery(query) {
  return query.trim();
}

export function evaluateQuery(ast, doc, { synonymsOf }) {
  // If we reach here, it means the query was not advanced, so this shouldn't be called.
  // Return a minimal result.
  return { matched: false, relevance: 0 };
}