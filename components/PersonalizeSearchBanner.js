export const dynamic = 'force-dynamic';
"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Car, X, ChevronRight } from "lucide-react";
import { vehicleMakes } from "@/data/sampleData";
import { useToast } from "@/contexts/ToastContext";

export default function PersonalizeSearchBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialMake = searchParams.get("make") || "";
  const [expanded, setExpanded] = useState(false);
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const years = Array.from({ length: 20 }, (_, i) => 2025 - i);
  const vehicle = initialMake ? `${initialMake}${searchParams.get("vehicleLabel") ? " " + searchParams.get("vehicleLabel") : ""}` : null;

  function apply(e) {
    e.preventDefault();
    if (!make || !model || !year) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("make", make);
    params.set("vehicleLabel", `${model} (${year})`);
    router.push(`${pathname}?${params.toString()}`);
    setExpanded(false);
    toast.success(`Boosting results compatible with your ${make} ${model} (${year})`);
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("make");
    params.delete("vehicleLabel");
    router.push(`${pathname}?${params.toString()}`);
    setMake("");
    setModel("");
    setYear("");
    toast.info("Showing all results");
  }

  if (vehicle && !expanded) {
    return (
      <div className="flex items-center justify-between gap-3 border border-fg rounded-md px-4 py-3 mb-6 text-sm">
        <span className="flex items-center gap-2">
          <Car size={15} />
          Showing parts compatible with <strong className="font-medium">{vehicle}</strong>
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setExpanded(true)} className="text-xs underline underline-offset-2">
            Change
          </button>
          <button onClick={clear} aria-label="Clear vehicle filter">
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center justify-between w-full gap-3 border border-line border-dashed rounded-md px-4 py-3 mb-6 text-sm hover:border-fg transition-colors"
      >
        <span className="flex items-center gap-2 text-muted">
          <Car size={15} />
          Showing results for all vehicles — customize to your car?
        </span>
        <ChevronRight size={15} className="text-muted" />
      </button>
    );
  }

  return (
    <form
      onSubmit={apply}
      className="border border-fg rounded-md p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
    >
      <div className="flex-1">
        <label className="block text-[11px] text-muted mb-1">Make</label>
        <select
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="w-full border border-line rounded-sm px-2.5 py-2 text-sm bg-bg focus:outline-none focus:border-fg"
        >
          <option value="">Select</option>
          {vehicleMakes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-[11px] text-muted mb-1">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!make}
          className="w-full border border-line rounded-sm px-2.5 py-2 text-sm bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
        >
          <option value="">Select</option>
          <option value="Corolla">Corolla</option>
          <option value="Hilux">Hilux</option>
          <option value="Prado">Prado</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-[11px] text-muted mb-1">Year</label>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={!model}
          className="w-full border border-line rounded-sm px-2.5 py-2 text-sm bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
        >
          <option value="">Select</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!make || !model || !year}
          className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-sm hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="border border-line text-sm px-3 py-2 rounded-sm hover:bg-bg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
