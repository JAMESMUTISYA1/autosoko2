"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, ShieldCheck, ShieldOff, ShieldQuestion } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import CreateBusinessModal from "./CreateBusinessModal";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-yellow-100 text-yellow-800",
  banned: "bg-red-100 text-red-800",
};

const VERIFICATION_ICON = {
  verified: <ShieldCheck size={14} className="text-green-600" />,
  rejected: <ShieldOff size={14} className="text-red-600" />,
  pending: <ShieldQuestion size={14} className="text-yellow-600" />,
  unverified: <ShieldQuestion size={14} className="text-gray-400" />,
};

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  const fetchBusinesses = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (verificationStatus) params.set("verificationStatus", verificationStatus);

      try {
        const res = await fetch(`/api/v1/admin/businesses?${params.toString()}`);
        const json = await res.json();
        if (json.success) {
          setBusinesses(json.data);
          setMeta(json.meta);
        } else {
          toast.error(json.error?.message || "Failed to load businesses");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    },
    [search, status, verificationStatus] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const t = setTimeout(() => fetchBusinesses(1), 300); // debounce search input
    return () => clearTimeout(t);
  }, [fetchBusinesses]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl">Businesses</h1>
          <p className="text-sm text-muted">Every seller business on AutoSoko.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> New Business
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, slug, or email..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <select
          value={verificationStatus}
          onChange={(e) => setVerificationStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All verification</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
      ) : businesses.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">No businesses match.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Business</th>
                <th className="px-4 py-2.5 font-medium">Owner</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Products</th>
                <th className="px-4 py-2.5 font-medium">Members</th>
                <th className="px-4 py-2.5 font-medium">Verification</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/businesses/${b.id}`} className="flex items-center gap-2 text-blue-600 font-medium hover:underline">
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200" />
                      )}
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.owner?.fullName || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{b.businessType.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-gray-600">{b._count.products}</td>
                  <td className="px-4 py-3 text-gray-600">{b._count.members}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 capitalize">
                      {VERIFICATION_ICON[b.verificationStatus]} {b.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchBusinesses(p)}
              className={`w-8 h-8 rounded-md text-sm ${p === meta.page ? "bg-blue-600 text-white" : "bg-white border border-gray-300"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBusinessModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchBusinesses(1);
          }}
        />
      )}
    </div>
  );
}