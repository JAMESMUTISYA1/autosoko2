"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { STATUS_META, formatMoney } from "@/lib/orders";

const STATUS_TABS = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "disputed", "cancelled", "refunded"];

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paymentStatus, search, dateFrom, dateTo, page]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: 20 });
      if (status !== "all") params.set("status", status);
      if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/v1/seller/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
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
        <h1 className="font-display text-2xl mb-1">Orders</h1>
        <p className="text-sm text-muted">Orders placed against your business.</p>
      </div>

      {/* Status tabs */}
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="relative md:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order #, buyer name, phone..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Payments</option>
          <option value="verified">Payment Verified</option>
          <option value="unverified">Payment Unverified</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      {loading && !orders.length ? (
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={32} className="mx-auto mb-2" />
          <p className="text-sm">No orders found.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/seller/orders/${o.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {o.buyer?.fullName || "—"}
                      <div className="text-xs text-gray-400">{o.buyer?.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.itemCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatMoney(o.totalMinor, o.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        o.paymentVerified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {o.paymentVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_META[o.status]?.badge}`}>
                        {STATUS_META[o.status]?.label || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/seller/orders/${o.id}`}
                className="block border border-gray-200 rounded-md p-4 bg-white"
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-blue-600">{o.orderNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_META[o.status]?.badge}`}>
                    {STATUS_META[o.status]?.label || o.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{o.buyer?.fullName || "—"} · {o.buyer?.phone}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-medium">{formatMoney(o.totalMinor, o.currency)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.paymentVerified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {o.paymentVerified ? "Paid" : "Unpaid"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
