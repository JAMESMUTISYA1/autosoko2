"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Trash2, Loader2, Archive } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import { useToast } from "@/contexts/ToastContext";

export default function SellerListingsPage() {
  const { data: session } = useSession();
  const businessId = session?.user?.businessId;
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  async function load() {
    if (!businessId) return;
    const res = await fetch(`/api/v1/products?businessId=${businessId}`).catch(() => null);
    const json = await res?.json().catch(() => null);
    setListings(json?.success ? json.data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [businessId]);

  async function handleDelete(id, force = false) {
    setActingId(id);
    const res = await fetch(`/api/v1/products/${id}${force ? "?force=true" : ""}`, { method: "DELETE" }).catch(() => null);
    setActingId(null);
    const json = await res?.json().catch(() => null);

    if (!res?.ok || !json?.success) {
      if (json?.error?.code === "PRODUCT_HAS_PENDING_ORDERS") {
        if (confirm("This product has pending orders. Archive it anyway?")) {
          handleDelete(id, true);
        }
        return;
      }
      toast.error(json?.error?.message || "Couldn't remove listing");
      return;
    }
    setListings((prev) => prev.filter((p) => p.id !== id));
    toast.success("Listing archived");
  }

  async function toggleStatus(id, currentStatus) {
    setActingId(id);
    const newStatus = currentStatus === "active" ? "draft" : "active";
    const res = await fetch(`/api/v1/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => null);
    setActingId(null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error("Couldn't update listing");
      return;
    }
    setListings((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    toast.success(`Listing ${newStatus === "active" ? "published" : "unpublished"}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">My Listings</h1>
        <Link href="/seller/listings/new" className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors">
          <Plus size={16} /> Create Listing
        </Link>
      </div>
      <p className="text-sm text-muted mb-8">Anyone can sell on AutoSoko — as an individual or a registered business.</p>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : listings.length === 0 ? (
        <div className="bg-card border border-line rounded-md px-5 py-12 text-center">
          <p className="text-sm text-muted mb-4">You haven't listed anything yet.</p>
          <Link href="/seller/listings/new" className="inline-block bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-accent/90">
            Create Your First Listing
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Price</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Stock</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {listings.map((p) => (
                <tr key={p.id} className="hover:bg-bg transition-colors">
                  <td className="px-5 py-3.5 font-medium">{p.name}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell font-mono">{formatPrice(p.priceMinor, p.currency)}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell font-mono">{p.stockQuantity}</td>
                  <td className="px-5 py-3.5 capitalize">{p.status}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStatus(p.id, p.status)}
                        disabled={actingId === p.id}
                        className="text-xs border border-line px-2.5 py-1.5 rounded-sm hover:border-fg disabled:opacity-50 transition-colors"
                      >
                        {p.status === "active" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={actingId === p.id}
                        aria-label={`Remove ${p.name}`}
                        className="text-muted hover:text-fg disabled:opacity-50"
                      >
                        {actingId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
