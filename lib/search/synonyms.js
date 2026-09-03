// Minimal synonym support: no synonyms are implemented yet.

export function synonymsOf(term) {
  return [term];
}

export function expandQueryWithSynonyms(query) {
  return [query]; // only the literal query
}