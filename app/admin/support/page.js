"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Search, Mail, Eye, CheckCircle2, RotateCcw, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function AdminSupportPage() {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchMessages();
  }, [search, statusFilter, page, mounted]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page);
      params.set("perPage", 20);

      const res = await fetch(`/api/v1/admin/support-messages?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setMessages(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(message) {
    const newStatus = message.status === "open" ? "resolved" : "open";
    if (!confirm(`Mark message as ${newStatus}?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/support-messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Message marked ${newStatus}`);
        fetchMessages();
      } else {
        toast.error(json.error?.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    }
  }

  function openDetail(message) {
    setSelectedMessage(message);
    setShowDetail(true);
  }

  if (!mounted) return <div className="min-h-screen bg-white"></div>;
  if (loading && !messages.length) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <Mail size={22} className="text-blue-600" /> Contact Messages
          </h1>
          <p className="text-sm text-muted">Messages from the public contact form.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, subject..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <p className="text-sm text-muted">No messages found.</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {messages.map((msg) => (
                  <tr key={msg.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p className="font-medium">{msg.name}</p>
                      <p className="text-xs text-gray-500">{msg.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{msg.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{msg.message}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(msg.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        msg.status === "open" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                      }`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openDetail(msg)} className="text-blue-600 hover:text-blue-800"><Eye size={16} /></button>
                      <button
                        onClick={() => toggleStatus(msg)}
                        className={msg.status === "open" ? "text-green-600 hover:text-green-800" : "text-yellow-600 hover:text-yellow-800"}
                      >
                        {msg.status === "open" ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="border border-gray-200 rounded-md p-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{msg.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${msg.status === "open" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                    {msg.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{msg.email}</p>
                <p className="text-sm text-gray-600 mt-1 font-medium">{msg.subject}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <button onClick={() => openDetail(msg)} className="text-blue-600">View</button>
                  <button onClick={() => toggleStatus(msg)} className={msg.status === "open" ? "text-green-600" : "text-yellow-600"}>
                    {msg.status === "open" ? "Mark Resolved" : "Reopen"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetail && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Message Details</h3>
              <button onClick={() => setShowDetail(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p><strong>From:</strong> {selectedMessage.name} ({selectedMessage.email})</p>
              <p><strong>Subject:</strong> {selectedMessage.subject}</p>
              <p><strong>Message:</strong></p>
              <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedMessage.message}</p>
              <p><strong>Status:</strong> {selectedMessage.status}</p>
              <p><strong>Received:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}</p>
              {selectedMessage.resolvedAt && (
                <>
                  <p><strong>Resolved At:</strong> {new Date(selectedMessage.resolvedAt).toLocaleString()}</p>
                  <p><strong>Resolved By:</strong> {selectedMessage.resolver?.fullName || "—"}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}