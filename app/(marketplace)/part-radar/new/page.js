"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar, Clock, ChevronRight, Info } from "lucide-react";
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

  // Recent requests (fetched from API)
  const [recentRequests, setRecentRequests] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch("/api/v1/part-requests?limit=3", { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setRecentRequests(json.data);
        }
      } catch (err) {
        console.warn("Could not load recent requests:", err);
      } finally {
        setLoadingRecent(false);
      }
    }
    fetchRecent();
  }, []);

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
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-600 px-6 py-4">
                <h1 className="text-2xl font-display text-white flex items-center gap-2">
                  <Radar size={24} className="text-yellow-400" />
                  Post to Part Radar
                </h1>
                <p className="text-blue-100 text-sm mt-1">
                  Describe what you need — the more detail, the faster sellers can respond.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Part Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="e.g. Rear bumper, driver side"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Vehicle
                  </label>
                  <input
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    placeholder="e.g. Toyota Corolla, 2018"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Part Number (if known)
                  </label>
                  <input
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    placeholder="OEM or reference number"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm font-mono text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Condition preference, color, anything that helps a seller match it"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Photo URL (optional)
                  </label>
                  <input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Link to a photo of the part or the damage"
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Direct file upload needs cloud storage set up — paste a link for now.
                  </p>
                </div>

                {error && (
                  <p className="text-sm font-semibold text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? "Posting..." : "Post Request"}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar: Recent Requests & Tips */}
          <div className="space-y-6">
            {/* Recent Requests */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Recent Requests
              </h3>
              {loadingRecent ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              ) : recentRequests.length === 0 ? (
                <p className="text-sm text-gray-500">No requests yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentRequests.map((req) => (
                    <li key={req.id}>
                      <a
                        href={`/part-radar/${req.id}`}
                        className="group flex items-start justify-between gap-2 text-sm text-gray-700 hover:text-blue-600"
                      >
                        <span className="line-clamp-2">{req.partName}</span>
                        <ChevronRight size={14} className="shrink-0 mt-1 text-gray-400 group-hover:text-blue-600" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <a
                href="/part-radar"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                View all requests
              </a>
            </div>

            {/* Tips */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm p-5">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <Info size={16} className="text-yellow-600" />
                Tips for Faster Responses
              </h3>
              <ul className="text-sm text-yellow-800 space-y-2">
                <li>• Include the exact year, make, and model.</li>
                <li>• Add a part number if you have it.</li>
                <li>• Mention condition preference (new/used).</li>
                <li>• Upload a clear photo of the part or damage.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}