"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Store as StoreIcon, Loader2 } from "lucide-react";
import { formatPrice } from "@/data/sampleData";

export default function SearchBar({ variant = "desktop" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSuggestions(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(value)}`);
        const json = await res.json();
        setSuggestions(json.data);
      } catch {
        setSuggestions(null);
      } finally {
        setLoading(false);
      }
    }, 200); // debounce — this is what keeps "fast" from meaning "a request per keystroke"
  }

  function goToSearch(q) {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim()) goToSearch(query.trim());
  }

  const hasSuggestions =
    suggestions && (suggestions.products.length > 0 || suggestions.stores.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex w-full rounded-sm overflow-hidden border border-invert-line focus-within:border-accent transition-colors">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search parts, OEM number, or a store name..."
          autoComplete="off"
          className="flex-1 bg-card text-fg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="bg-accent hover:bg-accent/90 transition-colors px-4 flex items-center justify-center"
        >
          {loading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <Search size={18} className="text-white" />
          )}
        </button>
      </form>

      {open && hasSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-line rounded-md shadow-xl shadow-black/10 overflow-hidden z-50 text-fg">
          {suggestions.stores.length > 0 && (
            <div className="border-b border-line">
              <p className="px-4 pt-3 pb-1.5 text-[11px] uppercase tracking-wider text-muted">
                Stores
              </p>
              {suggestions.stores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/store/${s.slug}`);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-bg transition-colors text-left"
                >
                  <StoreIcon size={14} className="text-muted shrink-0" />
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {suggestions.products.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[11px] uppercase tracking-wider text-muted">
                Products
              </p>
              {suggestions.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(false);
                    router.push(`/product/${p.slug}`);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg transition-colors text-left"
                >
                  {p.image && (
                    <div className="relative w-9 h-9 rounded-sm overflow-hidden border border-line shrink-0">
                      <Image src={p.image} alt="" fill className="object-cover" />
                    </div>
                  )}
                  <span className="text-sm line-clamp-1 flex-1">{p.name}</span>
                  <span className="text-xs font-mono text-muted shrink-0">
                    {formatPrice(p.priceMinor, p.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => goToSearch(query)}
            className="w-full px-4 py-2.5 text-xs text-accent hover:bg-bg transition-colors text-left border-t border-line"
          >
            See all results for "{query}"
          </button>
        </div>
      )}
    </div>
  );
}
