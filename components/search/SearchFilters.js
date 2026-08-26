"use client";
export const dynamic = 'force-dynamic';

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

export default function SearchFilters({ categories }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") || "");
  const [open, setOpen] = useState(false); // controls mobile visibility

  const activeCategory = searchParams.get("categoryId") || "";
  const activeCondition = searchParams.get("condition") || "";
  const verifiedOnly = searchParams.get("verified") === "true";

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleParam(key, value) {
    const current = searchParams.get(key);
    updateParam(key, current === value ? "" : value);
  }

  function applyPriceRange(e) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (priceMin) params.set("priceMin", String(Number(priceMin) * 100));
    else params.delete("priceMin");
    if (priceMax) params.set("priceMax", String(Number(priceMax) * 100));
    else params.delete("priceMax");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = activeCategory || activeCondition || verifiedOnly || priceMin || priceMax;

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    ["categoryId", "condition", "verified", "priceMin", "priceMax"].forEach((k) => params.delete(k));
    setPriceMin("");
    setPriceMax("");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <aside className="space-y-4">
      {/* Mobile toggle button — visible only on small screens */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="md:hidden flex items-center gap-1.5 text-sm border border-line rounded-sm px-3 py-1.5 text-gray-700"
        aria-expanded={open}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h18M6 12h12M10 20h4"
          />
        </svg>
        Filters
      </button>

      {/* Filter content — hidden on mobile unless open, always visible on md+ */}
      <div className={`${open ? "block" : "hidden"} md:block space-y-7`}>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-accent hover:underline">
            Clear all filters
          </button>
        )}

        <FilterGroup title="Category">
          {categories.map((c) => (
            <FilterCheckbox
              key={c.id}
              label={c.name}
              checked={activeCategory === c.id}
              onChange={() => toggleParam("categoryId", c.id)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Condition">
          {CONDITIONS.map((c) => (
            <FilterCheckbox
              key={c.value}
              label={c.label}
              checked={activeCondition === c.value}
              onChange={() => toggleParam("condition", c.value)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Price Range (KES)">
          <form onSubmit={applyPriceRange} className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-bg focus:outline-none focus:border-accent"
            />
            <span className="text-muted">–</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full border border-line rounded-sm px-2.5 py-1.5 text-sm bg-bg focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="shrink-0 border border-line rounded-sm px-2.5 py-1.5 text-xs hover:border-fg transition-colors"
            >
              Go
            </button>
          </form>
        </FilterGroup>

        <FilterGroup title="Seller">
          <FilterCheckbox
            label="Verified sellers only"
            checked={verifiedOnly}
            onChange={() => toggleParam("verified", verifiedOnly ? "" : "true")}
          />
        </FilterGroup>
      </div>
    </aside>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-muted mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded-sm border-line text-accent focus:ring-accent"
      />
      {label}
    </label>
  );
}