"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, MapPin,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

// Common suggestions only — this is a <datalist>, not a fixed set. Admins
// can type anything: "Delivery by 2NK Sacco", "Delivery by Kinatwa Sacco",
// "Same-Day Boda", whatever fits that town. The DeliveryMethod row is just
// { townId, method, provider, etaDays, feeMinor } — a town can have as many
// of these rows as it needs.
const METHOD_SUGGESTIONS = ["Courier", "Boda-boda", "Sacco / Matatu Parcel", "Pickup Point", "Same-Day Express"];

export default function AdminDeliveryPage() {
  const [mounted, setMounted] = useState(false);
  const [methods, setMethods] = useState([]);
  const [towns, setTowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [townFilter, setTownFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [form, setForm] = useState({
    townId: "",
    method: "",
    provider: "",
    etaDays: "",
    feeMinor: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, townFilter, activeFilter, page, mounted]);

  useEffect(() => {
    if (!mounted) return;
    fetchTowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  async function fetchTowns() {
    try {
      const res = await fetch("/api/v1/admin/towns");
      const json = await res.json();
      if (json.success) setTowns(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMethods() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (townFilter) params.set("townId", townFilter);
      if (activeFilter === "active") params.set("active", "true");
      if (activeFilter === "inactive") params.set("active", "false");
      params.set("page", page);
      params.set("perPage", 20);

      const res = await fetch(`/api/v1/admin/delivery-methods?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setMethods(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingMethod(null);
    setForm({ townId: townFilter || "", method: "", provider: "", etaDays: "", feeMinor: "", active: true });
    setShowModal(true);
  }

  function openEdit(m) {
    setEditingMethod(m);
    setForm({
      townId: m.town?.id || "",
      method: m.method,
      provider: m.provider,
      etaDays: m.etaDays.toString(),
      feeMinor: (m.feeMinor / 100).toString(),
      active: m.active,
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.townId || !form.method.trim() || !form.provider.trim() || form.etaDays === "" || form.feeMinor === "") {
      toast.error("Town, method, provider, ETA and fee are all required");
      return;
    }
    setSaving(true);
    const url = editingMethod
      ? `/api/v1/admin/delivery-methods/${editingMethod.id}`
      : "/api/v1/admin/delivery-methods";
    const method = editingMethod ? "PATCH" : "POST";
    const payload = {
      ...form,
      etaDays: Number(form.etaDays),
      feeMinor: Math.round(Number(form.feeMinor) * 100),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingMethod ? "Delivery method updated" : "Delivery method created");
        setShowModal(false);
        fetchMethods();
      } else {
        toast.error(json.error?.message || "Operation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(m) {
    try {
      const res = await fetch(`/api/v1/admin/delivery-methods/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !m.active }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Status updated");
        fetchMethods();
      } else {
        toast.error(json.error?.message || "Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleDelete(m) {
    if (!confirm(`Delete delivery method "${m.method} — ${m.provider}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/delivery-methods/${m.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Delivery method deleted");
        fetchMethods();
      } else {
        toast.error(json.error?.message || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  }

  if (!mounted) return <div className="min-h-screen bg-white" />;
  if (loading && !methods.length) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Delivery Methods</h1>
          <p className="text-sm text-muted">
            Every method belongs to one town. A town can carry as many as you need — a sacco, a boda option, a
            courier — each with its own fee and ETA.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/addresses?tab=towns"
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-md hover:bg-gray-50"
          >
            <MapPin size={16} /> Manage Towns
          </Link>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
          >
            <Plus size={16} /> Add Method
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search method, provider, town..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={townFilter}
          onChange={(e) => { setTownFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="">All Towns</option>
          {towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {methods.length === 0 ? (
        <p className="text-sm text-muted">No delivery methods found.</p>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Town</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {methods.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {m.town?.name || "—"}
                      {m.town?.region?.name ? <span className="text-gray-400">, {m.town.region.name}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{m.method}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.provider}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.etaDays} day{m.etaDays > 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">KES {(m.feeMinor / 100).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          m.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {m.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(m)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {methods.map((m) => (
              <div key={m.id} className="border border-gray-200 rounded-md p-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{m.method}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${m.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {m.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{m.provider} · {m.town?.name || "—"}</p>
                <p className="text-sm text-gray-500">{m.etaDays} days · KES {(m.feeMinor / 100).toLocaleString()}</p>
                <div className="flex gap-4 mt-3 text-sm">
                  <button onClick={() => openEdit(m)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleToggleActive(m)} className="text-yellow-600">
                    {m.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(m)} className="text-red-600">Delete</button>
                </div>
              </div>
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
              <span className="text-sm text-gray-600">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingMethod ? "Edit Delivery Method" : "Add Delivery Method"}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Town</label>
                <select
                  value={form.townId}
                  onChange={(e) => setForm({ ...form, townId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                >
                  <option value="">Select town</option>
                  {towns.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {towns.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    No towns yet — <Link href="/admin/addresses?tab=towns" className="text-blue-600 underline">add one first</Link>.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Method</label>
                <input
                  list="method-suggestions"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  placeholder="e.g. Delivery by 2NK Sacco"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                />
                <datalist id="method-suggestions">
                  {METHOD_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                </datalist>
                <p className="text-xs text-gray-400 mt-1">Free text — name it however it's known in this town.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Provider</label>
                <input
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                  placeholder="e.g. 2NK Sacco, Kinatwa Sacco, G4S"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">ETA (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.etaDays}
                    onChange={(e) => setForm({ ...form, etaDays: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Fee (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.feeMinor}
                    onChange={(e) => setForm({ ...form, feeMinor: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
              >
                {saving ? "Saving..." : editingMethod ? "Update Method" : "Create Method"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
