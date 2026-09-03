// app/api/search/autocomplete/route.js
import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/search/searchEngine";

// GET /api/search/autocomplete — fires on every keystroke (debounced
// client-side). Backed by a prefix index for near-instant lookups, with
// fuzzy Fuse only as a fallback when the prefix path is thin.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 6, 20);

    const result = await autocomplete(q, limit);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[api/search/autocomplete] unhandled error:", err);
    return NextResponse.json({ success: false, data: { products: [], stores: [], mechanics: [] } }, { status: 500 });
  }
}
