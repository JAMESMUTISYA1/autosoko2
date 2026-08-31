"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { STATUS_META } from "@/lib/sponsorships";
import { formatMoney } from "@/lib/orders";

const STATUS_TABS = ["all", "requested", "quoted", "active", "expired", "rejected", "cancelled"];

export default function AdminSponsorshipsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("requested"); // land on the queue that needs action
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

  async function fetchRows() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: 20 });
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/admin/sponsorships?${params.toString()}`);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl mb-1">Sponsorships</h1>
        <p className="text-sm text-muted">Review requests, set a price, and verify payment before a boost goes live.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-4">
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

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search product or business..."
          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading && !rows.length ? (
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone size={32} className="mx-auto mb-2" />
          <p className="text-sm">Nothing here.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/sponsorships/${r.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {r.product?.name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.business?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {r.amountMinor != null ? `${formatMoney(r.amountMinor, r.currency)} · ${r.durationDays}d` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_META[r.effectiveStatus]?.badge}`}>
                        {STATUS_META[r.effectiveStatus]?.label || r.effectiveStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.requestedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
