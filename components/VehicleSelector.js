"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { vehicleMakes } from "@/data/sampleData";

export default function VehicleSelector() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const years = Array.from({ length: 30 }, (_, i) => 2025 - i);

  return (
    <div className="bg-card rounded-md shadow-xl shadow-black/20 border border-line p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wide text-fg">
          FIND PARTS FOR YOUR VEHICLE
        </h3>
        <span className="font-mono text-[11px] text-muted">STEP 1 OF 1</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="border border-line rounded-sm px-3 py-2.5 text-sm text-fg bg-bg focus:outline-none focus:border-fg"
        >
          <option value="">Make</option>
          {vehicleMakes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!make}
          className="border border-line rounded-sm px-3 py-2.5 text-sm text-fg bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
        >
          <option value="">{make ? "Model" : "Select make first"}</option>
          <option value="corolla">Corolla</option>
          <option value="hilux">Hilux</option>
          <option value="prado">Prado</option>
        </select>

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={!model}
          className="border border-line rounded-sm px-3 py-2.5 text-sm text-fg bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
        >
          <option value="">{model ? "Year" : "Select model first"}</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <button className="mt-4 w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 transition-colors text-white font-semibold text-sm py-3 rounded-sm">
        <Search size={16} />
        Find Compatible Parts
      </button>

      <p className="mt-3 text-xs text-muted text-center">
        Or{" "}
        <a href="/search" className="text-fg underline underline-offset-2">
          browse all parts
        </a>{" "}
        without selecting a vehicle
      </p>
    </div>
  );
}
