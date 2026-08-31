"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, X, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { STATUS_META } from "@/lib/sponsorships";
import { formatMoney } from "@/lib/orders";

const STATUS_TABS = ["all", "requested", "quoted", "active", "expired", "rejected", "cancelled"];

export default function SellerSponsorshipsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: 20 });
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/v1/seller/sponsorships?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      // Seller's own product catalog — assumes GET /api/v1/seller/products
      // exists (mirrors the other seller-scoped list endpoints). Adjust
      // the path here if your product listing route differs.
      const res = await fetch("/api/v1/seller/products?status=active&perPage=100");
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  function openModal() {
    setProductId("");
    setRequestNote("");
    setShowModal(true);
    fetchProducts();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productId) {
      toast.error("Choose a product to sponsor");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/seller/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, requestNote: requestNote.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Sponsorship requested — an admin will send you a quote.");
        setShowModal(false);
        fetchRows();
      } else {
        toast.error(json.error?.message || "Could not submit request");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Sponsorships</h1>
          <p className="text-sm text-muted">Boost a product's placement for a set number of days.</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Request Sponsorship
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              status === s ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s === "all" ? "All" : STATUS_META[s]?.label || s}
          </button>
        ))}
      </div>

      {loading && !rows.length ? (
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone size={32} className="mx-auto mb-2" />
          <p className="text-sm">No sponsorships yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/seller/sponsorships/${r.id}`}
                className="border border-gray-200 rounded-lg bg-white p-4 hover:border-gray-300"
              >
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-md bg-gray-100 shrink-0 overflow-hidden">
                    {r.product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.product.imageUrl} alt={r.product.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.product.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_META[r.effectiveStatus]?.badge}`}>
                      {STATUS_META[r.effectiveStatus]?.label || r.effectiveStatus}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  {r.amountMinor != null ? (
                    <p>{formatMoney(r.amountMinor, r.currency)} · {r.durationDays} days</p>
                  ) : (
                    <p className="text-gray-400">Awaiting quote</p>
                  )}
                  {r.isCurrentlyActive && r.daysRemaining != null && (
                    <p className="text-xs text-green-700 mt-0.5">{r.daysRemaining} day{r.daysRemaining === 1 ? "" : "s"} remaining</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Request Sponsorship</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Pick a product to boost. An admin will review and send you a price and duration — nothing is
              charged until you accept and pay, and payment is manually verified before the boost goes live.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="e.g. Would like 2 weeks of boosted placement"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
