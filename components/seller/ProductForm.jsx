"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";

export default function ProductForm({ initialProduct, onSubmit, submitLabel }) {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: initialProduct?.name || "",
    categoryId: initialProduct?.category?.id || initialProduct?.categoryId || "",
    priceMinor: initialProduct?.priceMinor ? (initialProduct.priceMinor / 100).toString() : "",
    wholesalePriceMinor: initialProduct?.wholesalePriceMinor ? (initialProduct.wholesalePriceMinor / 100).toString() : "",
    stockQuantity: initialProduct?.stockQuantity?.toString() || "0",
    trackInventory: initialProduct?.trackInventory ?? true,
    moq: initialProduct?.moq?.toString() || "1",
    condition: initialProduct?.condition || "new",
    status: initialProduct?.status || "draft",
    brand: initialProduct?.brand || "",
    manufacturer: initialProduct?.manufacturer || "",
    oemNumber: initialProduct?.oemNumber || "",
    partNumber: initialProduct?.partNumber || "",
    sku: initialProduct?.sku || "",
    barcode: initialProduct?.barcode || "",
    warrantyMonths: initialProduct?.warrantyMonths?.toString() || "",
    weightGrams: initialProduct?.weightGrams?.toString() || "",
    lengthMm: initialProduct?.lengthMm?.toString() || "",
    widthMm: initialProduct?.widthMm?.toString() || "",
    heightMm: initialProduct?.heightMm?.toString() || "",
    shortDescription: initialProduct?.shortDescription || "",
    longDescription: initialProduct?.longDescription || "",
    youtubeUrl: initialProduct?.youtubeUrl || "",
    fittingInstructions: initialProduct?.fittingInstructions || "",
    toolsNeeded: Array.isArray(initialProduct?.toolsNeeded) ? initialProduct.toolsNeeded.join(", ") : "",
  });

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((json) => { if (json.success) setCategories(json.data); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.categoryId || !form.priceMinor) {
      toast.error("Name, category, and price are required");
      return;
    }

    const payload = {
      ...form,
      priceMinor: Math.round(Number(form.priceMinor) * 100),
      wholesalePriceMinor: form.wholesalePriceMinor ? Math.round(Number(form.wholesalePriceMinor) * 100) : null,
      stockQuantity: Number(form.stockQuantity),
      moq: Number(form.moq),
      warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : null,
      weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
      lengthMm: form.lengthMm ? Number(form.lengthMm) : null,
      widthMm: form.widthMm ? Number(form.widthMm) : null,
      heightMm: form.heightMm ? Number(form.heightMm) : null,
      toolsNeeded: form.toolsNeeded ? form.toolsNeeded.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Category *</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">SKU</label>
          <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Barcode</label>
          <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Price (KES) *</label>
          <input type="number" value={form.priceMinor} onChange={(e) => setForm({ ...form, priceMinor: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Wholesale (KES)</label>
          <input type="number" value={form.wholesalePriceMinor} onChange={(e) => setForm({ ...form, wholesalePriceMinor: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Stock *</label>
          <input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">MOQ</label>
          <input type="number" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Condition *</label>
          <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="archived">Archived</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Only "active" listings appear in the marketplace.</p>
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} className="h-4 w-4 text-blue-600" />
            Track inventory
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <input placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="OEM Number" value={form.oemNumber} onChange={(e) => setForm({ ...form, oemNumber: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="Part Number" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <input type="number" placeholder="Weight (g)" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input type="number" placeholder="Length (mm)" value={form.lengthMm} onChange={(e) => setForm({ ...form, lengthMm: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input type="number" placeholder="Width (mm)" value={form.widthMm} onChange={(e) => setForm({ ...form, widthMm: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input type="number" placeholder="Height (mm)" value={form.heightMm} onChange={(e) => setForm({ ...form, heightMm: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input type="number" placeholder="Warranty (months)" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Short Description</label>
        <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Long Description</label>
        <textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <input placeholder="YouTube URL" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <textarea placeholder="Fitting instructions" value={form.fittingInstructions} onChange={(e) => setForm({ ...form, fittingInstructions: e.target.value })} rows={1} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
        <input placeholder="Tools needed (comma separated)" value={form.toolsNeeded} onChange={(e) => setForm({ ...form, toolsNeeded: e.target.value })} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
      </div>

      <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}