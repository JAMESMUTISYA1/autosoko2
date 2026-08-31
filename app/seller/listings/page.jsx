"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-600",
  out_of_stock: "bg-yellow-100 text-yellow-800",
  archived: "bg-red-100 text-red-800",
};

export default function SellerListingsPage() {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const toast = useToast();

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      try {
        const res = await fetch(`/api/v1/seller/products?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setProducts(json.data);
          setMeta(json.meta);
        } else {
          toast.error(json.error?.message || "Failed to load listings");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    },
    [search, status] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(1), 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  async function handleDelete(id) {
    if (!confirm("Delete this listing?")) return;
    const res = await fetch(`/api/v1/seller/products/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Listing deleted");
      fetchProducts(meta.page);
    } else {
      toast.error(json.error?.message || "Failed to delete");
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl">My Listings</h1>
          <p className="text-sm text-muted">Products you're selling on AutoSoko.</p>
        </div>
        <Link
          href="/seller/listings/new"
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Create Listing
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, or part number..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">No listings match. Create your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <Link href={`/seller/listings/${p.id}`}>
                <div className="aspect-square bg-gray-100 relative">
                  {p.images?.[0]?.url ? (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/seller/listings/${p.id}`} className="text-sm font-medium line-clamp-1 hover:text-blue-600">
                  {p.name}
                </Link>
                <p className="text-xs text-gray-500">KES {(p.priceMinor / 100).toLocaleString()}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[p.status]}`}>
                    {p.status.replace("_", " ")}
                  </span>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchProducts(p)}
              className={`w-8 h-8 rounded-md text-sm ${p === meta.page ? "bg-blue-600 text-white" : "bg-white border border-gray-300"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}