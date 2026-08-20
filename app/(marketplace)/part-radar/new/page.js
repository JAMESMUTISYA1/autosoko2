"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function NewPartRequestPage() {
  const router = useRouter();
  const toast = useToast();
  const [partName, setPartName] = useState("");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!partName.trim()) {
      setError("Tell us what part you're looking for");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/v1/part-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partName,
        description: description || undefined,
        partNumber: partNumber || undefined,
        vehicleInfo: vehicleInfo || undefined,
        imageUrl: imageUrl || undefined,
      }),
    }).catch(() => null);
    setSubmitting(false);

    if (!response) {
      setError("Couldn't reach the server. Check your connection.");
      return;
    }
    if (response.status === 401) {
      router.push("/auth/login?redirectTo=/part-radar/new");
      return;
    }
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      setError(json?.error?.message || "Couldn't post your request. Try again.");
      return;
    }

    toast.success("Request posted — sellers can now see it on Part Radar");
    router.push(`/part-radar/${json.data.id}`);
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="font-display text-2xl mb-1 flex items-center gap-2">
        <Radar size={22} />
        Post to Part Radar
      </h1>
      <p className="text-sm text-muted mb-8">
        Describe what you need — the more detail, the faster sellers can respond.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-line rounded-md p-5">
        <div>
          <label className="block text-xs text-muted mb-1.5">Part Name</label>
          <input
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="e.g. Rear bumper, driver side"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Vehicle</label>
          <input
            value={vehicleInfo}
            onChange={(e) => setVehicleInfo(e.target.value)}
            placeholder="e.g. Toyota Corolla, 2018"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Part Number (if known)</label>
          <input
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm font-mono bg-bg focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Condition preference, color, anything that helps a seller match it"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Photo URL (optional)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Link to a photo of the part or the damage"
            className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
          />
          <p className="text-[11px] text-muted mt-1">
            Direct file upload needs cloud storage set up — paste a link for now.
          </p>
        </div>

        {error && <p className="text-sm font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-sm py-3 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Posting..." : "Post Request"}
        </button>
      </form>
    </div>
  );
}
