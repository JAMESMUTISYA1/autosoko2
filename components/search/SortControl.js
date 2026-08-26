"use client";
export const dynamic = 'force-dynamic';

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
];

export default function SortControl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") || "relevance";

  function handleChange(e) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "relevance") params.delete("sort");
    else params.set("sort", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative flex items-center gap-1.5 text-sm text-muted">
      Sort by:
      <select
        value={current}
        onChange={handleChange}
        className="appearance-none bg-transparent text-fg font-medium pr-5 focus:outline-none cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-0 pointer-events-none" />
    </div>
  );
}
