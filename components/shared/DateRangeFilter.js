"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";

const PRESETS = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom range" },
];

/**
 * Writes `period` (+ `from`/`to` for custom) to the URL so the Server
 * Component page above it re-fetches with the new range — same pattern
 * as SearchFilters. Pages consume this via lib/dateFilter.js's
 * `getDateRange(searchParams)` + `isWithinRange`.
 */
export default function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activePeriod = searchParams.get("period") || "all";
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  function applyPreset(id) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") {
      params.delete("period");
      params.delete("from");
      params.delete("to");
    } else if (id === "custom") {
      params.set("period", "custom");
      setOpen(true);
      router.push(`${pathname}?${params.toString()}`);
      return;
    } else {
      params.set("period", id);
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function applyCustomRange(e) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const activeLabel = PRESETS.find((p) => p.id === activePeriod)?.label || "All time";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border border-line rounded-sm px-3 py-2 text-sm hover:border-fg transition-colors"
      >
        <Calendar size={14} className="text-muted" />
        {activeLabel}
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-card border border-line rounded-md shadow-xl shadow-black/10 z-50 w-64 overflow-hidden">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg transition-colors ${
                activePeriod === p.id ? "text-accent font-medium" : ""
              }`}
            >
              {p.label}
            </button>
          ))}

          {activePeriod === "custom" && (
            <form onSubmit={applyCustomRange} className="p-3 border-t border-line space-y-2">
              <div>
                <label className="block text-[11px] text-muted mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full border border-line rounded-sm px-2 py-1.5 text-sm bg-bg focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full border border-line rounded-sm px-2 py-1.5 text-sm bg-bg focus:outline-none focus:border-accent"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-accent text-white text-xs font-semibold py-2 rounded-sm hover:bg-accent/90 transition-colors"
              >
                Apply
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
