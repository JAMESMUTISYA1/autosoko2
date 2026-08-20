"use client";

import { useState } from "react";
import { Plus, Truck, X, Loader2 } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import ActionedByBadge from "@/components/shared/ActionedByBadge";
import { useToast } from "@/contexts/ToastContext";

const DELIVERY_METHOD_TYPES = ["Courier", "Boda-boda", "Pickup Point", "Same-Day Express"];

export default function DeliveryMethodsList({ initialMethods, towns, currentActorName, lockedTownId }) {
  const [methods, setMethods] = useState(initialMethods);
  const [formOpen, setFormOpen] = useState(false);
  const [townId, setTownId] = useState(lockedTownId || "");
  const [method, setMethod] = useState(DELIVERY_METHOD_TYPES[0]);
  const [provider, setProvider] = useState("");
  const [etaDays, setEtaDays] = useState("2");
  const [fee, setFee] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleAdd(e) {
    e.preventDefault();
    if (!townId || !provider.trim()) return;

    setSubmitting(true);
    const res = await fetch("/api/v1/admin/delivery-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ townId, method, provider, etaDays: Number(etaDays), feeMinor: Math.round(Number(fee || 0) * 100) }),
    }).catch(() => null);
    setSubmitting(false);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Couldn't add delivery method");
      return;
    }

    setMethods((prev) => [
      { id: json.data.id, townId, method, provider, etaDays: Number(etaDays), feeMinor: Math.round(Number(fee || 0) * 100), active: true, addedBy: currentActorName },
      ...prev,
    ]);
    toast.success(`${method} added`);
    setFormOpen(false);
    setProvider("");
    setFee("");
  }

  async function toggleActive(id) {
    const current = methods.find((m) => m.id === id);
    const res = await fetch(`/api/v1/admin/delivery-methods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current.active }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error("Couldn't update — try again");
      return;
    }
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  }

  return (
    <div>
      <button onClick={() => setFormOpen((o) => !o)} className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors mb-5">
        <Plus size={16} /> Add Delivery Method
      </button>

      {formOpen && (
        <form onSubmit={handleAdd} className="bg-card border border-accent rounded-md p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base">New Delivery Method</h2>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>
          {!lockedTownId && (
            <div>
              <label className="block text-xs text-muted mb-1.5">Town</label>
              <select value={townId} onChange={(e) => setTownId(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent">
                <option value="">Select town</option>
                {towns.map((t) => <option key={t.id} value={t.id}>{t.name}{t.country ? `, ${t.country}` : ""}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Method Type</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent">
                {DELIVERY_METHOD_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">ETA (days)</label>
              <input type="number" min="0" value={etaDays} onChange={(e) => setEtaDays(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Provider</label>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Sendy, in-house riders" className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Fee (KES, 0 for free)</label>
            <input type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent" />
          </div>
          <button type="submit" disabled={submitting || !townId} className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
            {submitting && <Loader2 size={15} className="animate-spin" />} {submitting ? "Adding..." : "Add Method"}
          </button>
        </form>
      )}

      <div className="bg-card border border-line rounded-md divide-y divide-line">
        {methods.length === 0 && <p className="text-sm text-muted px-5 py-6">No delivery methods yet.</p>}
        {methods.map((m) => {
          const town = towns.find((t) => t.id === m.townId) || m.town;
          return (
            <div key={m.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Truck size={16} className="text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{m.method}</span> · {m.provider}
                    {town?.name && <span className="text-muted"> — {town.name}</span>}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                    <span>{m.etaDays} day ETA</span>
                    <span>{m.feeMinor > 0 ? formatPrice(m.feeMinor, "KES") : "Free"}</span>
                    <ActionedByBadge verb="Added" name={m.addedBy} />
                  </div>
                </div>
              </div>
              <button onClick={() => toggleActive(m.id)} className={`text-[11px] px-2.5 py-1.5 rounded-sm border shrink-0 transition-colors ${m.active ? "border-fg" : "border-line text-muted"}`}>
                {m.active ? "Active" : "Inactive"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
