"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Search } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const BUSINESS_TYPES = [
  "distributor", "dealer", "wholesaler", "importer", "manufacturer",
  "fleet", "insurance", "transport", "individual_seller",
];

// NOTE: assumes a locations lookup API shaped like the existing
// /api/v1/vehicle-data pattern: /api/v1/locations?type=countries and
// /api/v1/locations?type=regions&parentId=<countryId>, ?type=towns&parentId=<regionId>.
// Update the three fetch URLs below if your actual endpoint differs.
export default function CreateBusinessModal({ onClose, onCreated }) {
  const toast = useToast();
  const router = useRouter();

  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [towns, setTowns] = useState([]);

  const [ownerMode, setOwnerMode] = useState("new");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const [form, setForm] = useState({
    name: "", businessType: "dealer", description: "",
    countryId: "", regionId: "", townId: "", physicalAddress: "",
    email: "", phone: "", whatsapp: "", website: "", homeCurrency: "KES",
    ownerFullName: "", ownerEmail: "", ownerPhone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/locations?type=countries")
      .then((r) => r.json())
      .then((json) => { if (json.success) setCountries(json.data); })
      .catch(() => {});
  }, []);

  function handleCountryChange(e) {
    const countryId = e.target.value;
    setForm((f) => ({ ...f, countryId, regionId: "", townId: "" }));
    setRegions([]);
    setTowns([]);
    if (countryId) {
      fetch(`/api/v1/locations?type=regions&parentId=${countryId}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setRegions(json.data); })
        .catch(() => {});
    }
  }

  function handleRegionChange(e) {
    const regionId = e.target.value;
    setForm((f) => ({ ...f, regionId, townId: "" }));
    setTowns([]);
    if (regionId) {
      fetch(`/api/v1/locations?type=towns&parentId=${regionId}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setTowns(json.data); })
        .catch(() => {});
    }
  }

  async function searchOwners() {
    if (ownerSearch.trim().length < 2) return;
    const res = await fetch(`/api/v1/admin/users/search?q=${encodeURIComponent(ownerSearch)}`);
    const json = await res.json();
    if (json.success) setOwnerResults(json.data);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const owner =
      ownerMode === "existing"
        ? { mode: "existing", userId: selectedOwner?.id }
        : { mode: "new", fullName: form.ownerFullName, email: form.ownerEmail || undefined, phone: form.ownerPhone || undefined };

    if (ownerMode === "existing" && !owner.userId) {
      toast.error("Select an existing user as the owner first");
      return;
    }
    if (ownerMode === "new" && (!owner.fullName || (!owner.email && !owner.phone))) {
      toast.error("Owner name and email or phone are required");
      return;
    }
    if (!form.name || !form.countryId) {
      toast.error("Business name and country are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, owner }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Business created");
        onCreated();
        router.push(`/admin/businesses/${json.data.id}`);
      } else {
        toast.error(json.error?.message || "Failed to create business");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">New Business</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Business Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Business Type *</label>
              <select
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Country *</label>
              <select value={form.countryId} onChange={handleCountryChange} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required>
                <option value="">Select country</option>
                {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Region</label>
              <select
                value={form.regionId}
                onChange={handleRegionChange}
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
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Physical Address</label>
            <input
              value={form.physicalAddress}
              onChange={(e) => setForm({ ...form, physicalAddress: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
            <input
              placeholder="WhatsApp"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          </div>

          <hr />

          <div>
            <h3 className="text-sm font-semibold mb-2">Owner</h3>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setOwnerMode("new")}
                className={`flex-1 py-2 text-sm font-medium rounded-md border ${
                  ownerMode === "new" ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-500"
                }`}
              >
                Invite New Owner
              </button>
              <button
                type="button"
                onClick={() => setOwnerMode("existing")}
                className={`flex-1 py-2 text-sm font-medium rounded-md border ${
                  ownerMode === "existing" ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-500"
                }`}
              >
                Use Existing User
              </button>
            </div>

            {ownerMode === "new" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  placeholder="Full name *"
                  value={form.ownerFullName}
                  onChange={(e) => setForm({ ...form, ownerFullName: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                />
                <input
                  placeholder="Phone"
                  value={form.ownerPhone}
                  onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                />
                <p className="sm:col-span-3 text-xs text-gray-500">
                  They'll be created with no password and use "Forgot password" to set one before their first seller login.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={ownerSearch}
                      onChange={(e) => setOwnerSearch(e.target.value)}
                      placeholder="Search by name, email, or phone"
                      className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                  <button type="button" onClick={searchOwners} className="px-4 py-2.5 border border-gray-300 rounded-md text-sm">
                    Search
                  </button>
                </div>
                {ownerResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-md divide-y max-h-40 overflow-y-auto">
                    {ownerResults.map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setSelectedOwner(u)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedOwner?.id === u.id ? "bg-blue-50" : ""}`}
                      >
                        {u.fullName} — {u.email || u.phone}
                      </button>
                    ))}
                  </div>
                )}
                {selectedOwner && <p className="text-xs text-green-700 mt-1">Selected: {selectedOwner.fullName}</p>}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Business"}
          </button>
        </form>
      </div>
    </div>
  );
}