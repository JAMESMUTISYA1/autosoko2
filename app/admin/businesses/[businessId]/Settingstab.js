"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const BUSINESS_TYPES = [
  "distributor", "dealer", "wholesaler", "importer", "manufacturer",
  "fleet", "insurance", "transport", "individual_seller",
];

export default function SettingsTab({ business, onUpdate }) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState({
    name: business.name,
    description: business.description || "",
    businessType: business.businessType,
    email: business.email || "",
    phone: business.phone || "",
    whatsapp: business.whatsapp || "",
    website: business.website || "",
    homeCurrency: business.homeCurrency,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Business updated");
        onUpdate();
      } else {
        toast.error(json.error?.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(file, target) {
    const setUploading = target === "logo" ? setUploadingLogo : setUploadingBanner;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", target);
      // ✅ Correct endpoint: image route (handles both logo & banner)
      const res = await fetch(`/api/v1/admin/businesses/${business.id}/image`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${target === "logo" ? "Logo" : "Banner"} updated`);
        onUpdate();
      } else {
        toast.error(json.error?.message || "Upload failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${business.name}"? This cannot be undone from here.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${business.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Business deleted");
        router.push("/admin/businesses");
      } else {
        toast.error(json.error?.message || "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Branding */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Branding</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadField
            label="Logo"
            currentUrl={business.logoUrl}
            uploading={uploadingLogo}
            onSelect={(file) => handleImageUpload(file, "logo")}
          />
          <ImageUploadField
            label="Banner"
            currentUrl={business.bannerUrl}
            uploading={uploadingBanner}
            onSelect={(file) => handleImageUpload(file, "banner")}
          />
        </div>
      </div>

      {/* Business Info */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h3 className="font-semibold">Business Info</h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            placeholder="Email"
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
        <input
          placeholder="Website"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-lg p-5">
        <h3 className="font-semibold text-red-700 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-600 mb-3">
          Deleting a business hides it everywhere and suspends it. This cannot be undone from this screen.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete Business"}
        </button>
      </div>
    </div>
  );
}

function ImageUploadField({ label, currentUrl, uploading, onSelect }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-16 h-16 rounded-md object-cover border border-gray-200" />
        ) : (
          <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400">
            None
          </div>
        )}
        <label className="cursor-pointer text-sm text-blue-600 hover:underline">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}