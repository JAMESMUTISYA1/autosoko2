"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Loader2, Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  MapPin, Globe, Home,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function AdminAddressesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AdminAddressesPageInner />
    </Suspense>
  );
}

function AdminAddressesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabFromUrl = searchParams.get("tab");
  const validTabs = ["addresses", "regions", "towns"];
  const [activeTab, setActiveTab] = useState(validTabs.includes(tabFromUrl) ? tabFromUrl : "addresses");

  function selectTab(tab) {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  }

  return (
    <div>
      <div className="mb-1">
        <h1 className="font-display text-2xl">Locations</h1>
        <p className="text-sm text-muted">
          Countries, regions and towns are the shared geography that addresses, delivery methods, mechanics and
          business branches all hang off of. Manage them here in one place.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 my-6">
        <TabButton active={activeTab === "addresses"} onClick={() => selectTab("addresses")} icon={Home} label="Addresses" />
        <TabButton active={activeTab === "regions"} onClick={() => selectTab("regions")} icon={Globe} label="Regions" />
        <TabButton active={activeTab === "towns"} onClick={() => selectTab("towns")} icon={MapPin} label="Towns" />
      </div>

      {activeTab === "addresses" && <AddressesTab />}
      {activeTab === "regions" && <RegionsTab />}
      {activeTab === "towns" && <TownsTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}

// ==================== ADDRESSES TAB ====================
// Address only ever stores a townId (per schema). Country/Region here are
// UI-only helpers to narrow the Town dropdown — they're stripped from the
// payload before it's sent.
function AddressesTab() {
  const [addresses, setAddresses] = useState([]);
  const [users, setUsers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [towns, setTowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 1 });

  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [form, setForm] = useState({
    userId: "",
    label: "",
    recipientName: "",
    phone: "",
    addressLine: "",
    countryId: "",
    regionId: "",
    townId: "",
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchAddresses();
    fetchUsers();
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  async function fetchAddresses() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page, perPage: 20 });
      const res = await fetch(`/api/v1/admin/addresses?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAddresses(json.data);
        setMeta(json.meta || { page: 1, perPage: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers(userSearch = "") {
    try {
      const params = new URLSearchParams({ type: "regular", perPage: 100 });
      if (userSearch) params.set("search", userSearch);
      const res = await fetch(`/api/v1/admin/accounts?${params.toString()}`);
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchCountries() {
    try {
      const res = await fetch("/api/v1/admin/countries");
      const json = await res.json();
      if (json.success) setCountries(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchRegions(countryId) {
    if (!countryId) {
      setRegions([]);
      setTowns([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/regions?countryId=${countryId}`);
      const json = await res.json();
      if (json.success) setRegions(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchTowns(regionId) {
    if (!regionId) {
      setTowns([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/towns?regionId=${regionId}`);
      const json = await res.json();
      if (json.success) setTowns(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  function openCreate() {
    setEditingAddress(null);
    setForm({
      userId: "", label: "", recipientName: "", phone: "", addressLine: "",
      countryId: "", regionId: "", townId: "", isDefault: false,
    });
    setShowModal(true);
  }

  function openEdit(addr) {
    setEditingAddress(addr);
    setForm({
      userId: addr.user.id,
      label: addr.label || "",
      recipientName: addr.recipientName || "",
      phone: addr.phone || "",
      addressLine: addr.addressLine,
      countryId: addr.town?.region?.country?.id || "",
      regionId: addr.town?.region?.id || "",
      townId: addr.town?.id || "",
      isDefault: addr.isDefault,
    });
    if (addr.town?.region?.country?.id) fetchRegions(addr.town.region.country.id);
    if (addr.town?.region?.id) fetchTowns(addr.town.region.id);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.userId || !form.addressLine.trim()) {
      toast.error("User and address line are required");
      return;
    }
    setSaving(true);
    const url = editingAddress ? `/api/v1/admin/addresses/${editingAddress.id}` : "/api/v1/admin/addresses";
    const method = editingAddress ? "PATCH" : "POST";
    // countryId/regionId are cascade helpers only — the schema stores townId.
    const { countryId, regionId, ...payload } = form;
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingAddress ? "Address updated" : "Address created");
        setShowModal(false);
        fetchAddresses();
      } else {
        toast.error(json.error?.message || "Operation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addr) {
    if (!confirm(`Delete address "${addr.addressLine}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/addresses/${addr.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Address deleted");
        fetchAddresses();
      } else {
        toast.error(json.error?.message || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  }

  if (loading && !addresses.length) {
    return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Addresses</h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Add Address
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search address, user, town..."
          className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted">No addresses found.</p>
      ) : (
        <>
          <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Town</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {addresses.map((addr) => (
                  <tr key={addr.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{addr.user?.fullName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{addr.addressLine}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {addr.town?.name || "—"}
                      {addr.town?.region?.name ? <span className="text-gray-400">, {addr.town.region.name}</span> : null}
                    </td>
                    <td className="px-4 py-3">{addr.isDefault ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEdit(addr)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(addr)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="border border-gray-200 rounded-md p-4 bg-white">
                <div className="flex justify-between">
                  <span className="font-medium">{addr.addressLine}</span>
                  {addr.isDefault && <span className="text-xs text-green-700">Default</span>}
                </div>
                <p className="text-sm text-gray-500">{addr.user?.fullName || "—"}</p>
                <p className="text-sm text-gray-500">{addr.town?.name || "—"}</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <button onClick={() => openEdit(addr)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(addr)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{editingAddress ? "Edit Address" : "Add Address"}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">User</label>
                <select
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                >
                  <option value="">Select user</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Address Line</label>
                <input
                  value={form.addressLine}
                  onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Label</label>
                  <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Recipient Name</label>
                  <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Country</label>
                <select
                  value={form.countryId}
                  onChange={(e) => { setForm({ ...form, countryId: e.target.value, regionId: "", townId: "" }); fetchRegions(e.target.value); }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                >
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Region</label>
                <select
                  value={form.regionId}
                  onChange={(e) => { setForm({ ...form, regionId: e.target.value, townId: "" }); fetchTowns(e.target.value); }}
                  disabled={!form.countryId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select region</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Town</label>
                <select
                  value={form.townId}
                  onChange={(e) => setForm({ ...form, townId: e.target.value })}
                  disabled={!form.regionId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select town</option>
                  {towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-700">Set as default</span>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
                {saving ? "Saving..." : editingAddress ? "Update Address" : "Create Address"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== REGIONS TAB ====================
function RegionsTab() {
  const [regions, setRegions] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [form, setForm] = useState({ name: "", countryId: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchRegions();
    fetchCountries();
  }, []);

  async function fetchRegions() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/regions");
      const json = await res.json();
      if (json.success) setRegions(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCountries() {
    const res = await fetch("/api/v1/admin/countries");
    const json = await res.json();
    if (json.success) setCountries(json.data);
  }

  function openCreate() {
    setEditingRegion(null);
    setForm({ name: "", countryId: "" });
    setShowModal(true);
  }

  function openEdit(region) {
    setEditingRegion(region);
    setForm({ name: region.name, countryId: region.country?.id || "" });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.countryId) {
      toast.error("Name and country are required");
      return;
    }
    setSaving(true);
    const url = editingRegion ? `/api/v1/admin/regions/${editingRegion.id}` : "/api/v1/admin/regions";
    const method = editingRegion ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingRegion ? "Region updated" : "Region created");
        setShowModal(false);
        fetchRegions();
      } else {
        toast.error(json.error?.message || "Operation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(region) {
    if (!confirm(`Delete region "${region.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/regions/${region.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Region deleted");
        fetchRegions();
      } else {
        toast.error(json.error?.message || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Regions</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md">
          <Plus size={16} /> Add Region
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {regions.map((region) => (
              <tr key={region.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{region.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{region.country?.name || "—"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(region)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(region)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingRegion ? "Edit Region" : "Add Region"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Country</label>
                <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
                {saving ? "Saving..." : editingRegion ? "Update Region" : "Create Region"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== TOWNS TAB ====================
// This is the single place towns are managed. The Delivery Methods page
// links here instead of duplicating this CRUD, so a town created for
// delivery purposes is the same town addresses, branches, and mechanics
// can use — one row per real place, not one per feature.
function TownsTab() {
  const [towns, setTowns] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTown, setEditingTown] = useState(null);
  const [form, setForm] = useState({ name: "", regionId: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchTowns();
    fetchRegions();
  }, []);

  async function fetchTowns() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/towns");
      const json = await res.json();
      if (json.success) setTowns(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRegions() {
    const res = await fetch("/api/v1/admin/regions");
    const json = await res.json();
    if (json.success) setRegions(json.data);
  }

  function openCreate() {
    setEditingTown(null);
    setForm({ name: "", regionId: "" });
    setShowModal(true);
  }

  function openEdit(town) {
    setEditingTown(town);
    setForm({ name: town.name, regionId: town.region?.id || "" });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.regionId) {
      toast.error("Name and region are required");
      return;
    }
    setSaving(true);
    const url = editingTown ? `/api/v1/admin/towns/${editingTown.id}` : "/api/v1/admin/towns";
    const method = editingTown ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingTown ? "Town updated" : "Town created");
        setShowModal(false);
        fetchTowns();
      } else {
        toast.error(json.error?.message || "Operation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(town) {
    if (!confirm(`Delete town "${town.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/towns/${town.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Town deleted");
        fetchTowns();
      } else {
        toast.error(json.error?.message || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Towns</h2>
        <button onClick={openCreate} className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md">
          <Plus size={16} /> Add Town
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {towns.map((town) => (
              <tr key={town.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{town.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{town.region?.name || "—"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(town)} className="text-blue-600 hover:text-blue-800"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(town)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">{editingTown ? "Edit Town" : "Add Town"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Region</label>
                <select value={form.regionId} onChange={(e) => setForm({ ...form, regionId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required>
                  <option value="">Select region</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
                {saving ? "Saving..." : editingTown ? "Update Town" : "Create Town"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, total, onChange }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button onClick={() => onChange((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-gray-600">Page {page} of {totalPages} ({total} total)</span>
      <button onClick={() => onChange((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
