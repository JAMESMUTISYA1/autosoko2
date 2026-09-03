// lib/search/highlight.js
/**
 * Converts a string + Fuse.js match indices ([[start,end], ...]) into an
 * array of { text, matched } segments a component can map over to bold
 * the parts that actually matched the query — the same "why did this
 * show up" affordance real search engines give you.
 */
export function toHighlightSegments(text, indices) {
  if (!indices || indices.length === 0) return [{ text, matched: false }];

  const segments = [];
  let cursor = 0;

  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  for (const [start, end] of sorted) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), matched: false });
    }
    segments.push({ text: text.slice(start, end + 1), matched: true });
    cursor = end + 1;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }
  return segments;
}

export function getFieldMatches(matches, key) {
  return matches?.find((m) => m.key === key)?.indices || null;
}
