"use client";

import { useState } from "react";
import { Megaphone, Loader2, TrendingUp } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import { getCurrentSellerListings } from "@/data/sellerData";
import { useToast } from "@/contexts/ToastContext";

const DURATIONS = [
  { id: "7", label: "7 days", priceMinor: 50000 },
  { id: "14", label: "14 days", priceMinor: 90000 },
  { id: "30", label: "30 days", priceMinor: 160000 },
];

export default function SponsorshipPage() {
  const listings = getCurrentSellerListings();
  const toast = useToast();
  const [productId, setProductId] = useState("");
  const [duration, setDuration] = useState(DURATIONS[0].id);
  const [submitting, setSubmitting] = useState(false);

  const selectedDuration = DURATIONS.find((d) => d.id === duration);
  const selectedProduct = listings.find((p) => p.id === productId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productId) return;

    setSubmitting(true);
    // Replace with POST /api/v1/products/:id/sponsor — not yet in Document 3;
    // worth adding as a §3.5 alongside product endpoints. Payment for the
    // sponsorship fee reuses the same PaymentProvider adapters as checkout.
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);

    toast.success(`"${selectedProduct.name}" is now sponsored for ${selectedDuration.label}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1 flex items-center gap-2">
        <Megaphone size={22} />
        Sponsorship
      </h1>
      <p className="text-sm text-muted mb-8">
        Sponsored listings appear in a dedicated section at the top of
        matching search results and carry a "Sponsored" badge.
      </p>

      {listings.length === 0 ? (
        <div className="bg-card border border-line rounded-md px-5 py-10 text-center">
          <p className="text-sm text-muted">You need an active listing before you can sponsor it.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card border border-line rounded-md p-5 space-y-5">
          <div>
            <label className="block text-xs text-muted mb-1.5">Listing to Sponsor</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            >
              <option value="">Select a listing</option>
              {listings.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sponsored ? "(already sponsored)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map((d) => (
                <label
                  key={d.id}
                  className={`text-center border rounded-sm px-3 py-3 cursor-pointer ${
                    duration === d.id ? "border-fg bg-fg text-bg" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={d.id}
                    checked={duration === d.id}
                    onChange={() => setDuration(d.id)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-medium">{d.label}</span>
                  <span className="block text-xs mt-0.5 opacity-80">
                    {formatPrice(d.priceMinor, "KES")}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted bg-bg border border-line rounded-sm px-3.5 py-3">
            <TrendingUp size={14} className="shrink-0 mt-0.5" />
            Sponsored listings typically see 2-4× more views. You're only
            charged for the duration selected — no per-click fees.
          </div>

          <button
            type="submit"
            disabled={!productId || submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-sm py-3 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting
              ? "Processing..."
              : `Sponsor for ${formatPrice(selectedDuration.priceMinor, "KES")}`}
          </button>
        </form>
      )}
    </div>
  );
}
