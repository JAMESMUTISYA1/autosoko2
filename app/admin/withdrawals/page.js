"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Search, CheckCircle2, XCircle, Clock, Banknote, ChevronLeft, ChevronRight,
  Eye, Check, X,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatPrice } from "@/data/sampleData";

export default function AdminWithdrawalsPage() {
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, paid: 0, pendingAmountMinor: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchRequests();
  }, [search, statusFilter, page, mounted]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page);
      params.set("perPage", 20);

      const res = await fetch(`/api/v1/admin/withdrawals?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status, confirmMessage) {
    if (!confirm(confirmMessage)) return;
    try {
      const res = await fetch(`/api/v1/admin/withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Withdrawal ${status}`);
        fetchRequests();
      } else {
        toast.error(json.error?.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    }
  }

  function openDetail(req) {
    setSelectedRequest(req);
    setShowDetail(true);
  }

  if (!mounted) return <div className="min-h-screen bg-white"></div>;
  if (loading && !requests.length) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Withdrawals</h1>
          <p className="text-sm text-muted">Seller payout requests. Approve, then mark paid once transfer completes.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Requests" value={stats.pending} icon={Clock} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} />
        <StatCard label="Paid" value={stats.paid} icon={Banknote} />
        <StatCard label="Pending Amount" value={formatPrice(stats.pendingAmountMinor, "KES")} icon={Banknote} />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search business, method, destination..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Withdrawals List */}
      {requests.length === 0 ? (
        <p className="text-sm text-muted">No withdrawal requests found.</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{req.business?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatPrice(req.amountMinor, req.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.method}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.destination}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openDetail(req)} className="text-blue-600 hover:text-blue-800"><Eye size={16} /></button>
                      {req.status === "pending" && (
                        <>
                          <button onClick={() => updateStatus(req.id, "approved", "Approve this withdrawal?")} className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                          <button onClick={() => updateStatus(req.id, "rejected", "Reject this withdrawal?")} className="text-red-600 hover:text-red-800"><XCircle size={16} /></button>
                        </>
                      )}
                      {req.status === "approved" && (
                        <button onClick={() => updateStatus(req.id, "paid", "Mark as paid?")} className="text-indigo-600 hover:text-indigo-800"><Banknote size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="border border-gray-200 rounded-md p-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{req.business?.name || "—"}</span>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-sm text-gray-600 mt-1">{formatPrice(req.amountMinor, req.currency)}</p>
                <p className="text-sm text-gray-600">{req.method} → {req.destination}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <button onClick={() => openDetail(req)} className="text-blue-600">View</button>
                  {req.status === "pending" && (
                    <>
                      <button onClick={() => updateStatus(req.id, "approved", "Approve?")} className="text-green-600">Approve</button>
                      <button onClick={() => updateStatus(req.id, "rejected", "Reject?")} className="text-red-600">Reject</button>
                    </>
                  )}
                  {req.status === "approved" && (
                    <button onClick={() => updateStatus(req.id, "paid", "Mark paid?")} className="text-indigo-600">Paid</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetail && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Withdrawal Details</h3>
              <button onClick={() => setShowDetail(false)}><X size={20} /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Business:</strong> {selectedRequest.business?.name || "—"}</p>
              <p><strong>Amount:</strong> {formatPrice(selectedRequest.amountMinor, selectedRequest.currency)}</p>
              <p><strong>Method:</strong> {selectedRequest.method}</p>
              <p><strong>Destination:</strong> {selectedRequest.destination}</p>
              <p><strong>Status:</strong> {selectedRequest.status}</p>
              <p><strong>Requested At:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
              {selectedRequest.processedAt && (
                <>
                  <p><strong>Processed At:</strong> {new Date(selectedRequest.processedAt).toLocaleString()}</p>
                  <p><strong>Processed By:</strong> {selectedRequest.processor?.fullName || "—"}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
        <Icon size={16} className="text-blue-600" />
        {label}
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const cls = config[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}