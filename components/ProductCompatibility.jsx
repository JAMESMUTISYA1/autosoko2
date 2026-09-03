// PATH: components/ProductCompatibility.js

import { ShieldCheck } from "lucide-react";

// Mirrors the describeLink() logic in the seller's CompatibilityTab.js —
// a compatibility row can be a Model-level link (fits every generation and
// trim), a Generation-level link (fits every trim in that generation), or
// a Trim-level link (the most specific). Exactly one of the three is set
// per row, enforced server-side when the link is created.
function describeLink(c) {
  if (c.vehicleTrim) {
    const g = c.vehicleTrim.generation;
    return `${g.model.make.name} ${g.model.name} — ${g.name} (${g.yearStart}–${g.yearEnd || "present"}), ${c.vehicleTrim.name}`;
  }
  if (c.vehicleGeneration) {
    const g = c.vehicleGeneration;
    return `${g.model.make.name} ${g.model.name} — ${g.name} (${g.yearStart}–${g.yearEnd || "present"}), all trims`;
  }
  const m = c.vehicleModel;
  return `${m.make.name} ${m.name} — all generations & trims`;
}

export default function ProductCompatibility({ compatibility = [] }) {
  if (compatibility.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg mb-3">Compatible Vehicles</h2>
      <ul className="space-y-2">
        {compatibility.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-2 text-sm bg-card border border-line rounded-sm px-3 py-2.5"
          >
            <ShieldCheck size={14} className="text-fg shrink-0" />
            {describeLink(c)}
          </li>
        ))}
      </ul>
    </div>
  );
}