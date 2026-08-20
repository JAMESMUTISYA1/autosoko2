import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/search/searchEngine";

// GET /api/search/autocomplete — mirrors Document 3 §5.2. Fires on every
// keystroke (debounced client-side), so this stays intentionally cheap —
// no scoring blend, just fast fuzzy hits.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const result = await autocomplete(q); // <-- await the async function

  return NextResponse.json({ success: true, data: result });
}