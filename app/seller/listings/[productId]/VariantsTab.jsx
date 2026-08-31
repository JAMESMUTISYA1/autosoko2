"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function VariantsTab({ productId, variants = [], onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  async function handleDelete(variantId) {
    if (!confirm("Delete this variant?")) return;
    const res = await fetch(`/api/v1/seller/products/${productId}/variants/${variantId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Variant deleted");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to delete variant");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">Variants</h2>
          <p className="text-sm text-gray-500">For products that come in different colors, sizes, etc.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Add Variant
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {variants.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No variants — this product is sold as a single option.</p>}
        {variants.map((v) => (
          <div key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="font-medium">
                {Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(", ")}
              </span>
              <div className="text-xs text-gray-500">
                {v.sku && `SKU: ${v.sku} · `}
                Stock: {v.stockQuantity}
                {v.priceMinorOverride ? ` · KES ${(v.priceMinorOverride / 100).toLocaleString()}` : ""}
              </div>
            </div>
            <button onClick={() => handleDelete(v.id)} className="text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <VariantFormModal
          productId={productId}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

function VariantFormModal({ productId, onClose, onSaved }) {
  const [attrRows, setAttrRows] = useState([{ key: "Color", value: "" }]);
  const [sku, setSku] = useState("");
  const [priceMinorOverride, setPriceMinorOverride] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  function updateRow(index, field, value) {
    setAttrRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setAttrRows((rows) => [...rows, { key: "", value: "" }]);
  }
  function removeRow(index) {
    setAttrRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const attributes = {};
    for (const row of attrRows) {
      if (row.key.trim() && row.value.trim()) attributes[row.key.trim()] = row.value.trim();
    }
    if (Object.keys(attributes).length === 0) {
      toast.error("Add at least one attribute, e.g. Color: Red");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/seller/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attributes,
          sku: sku || undefined,
          priceMinorOverride: priceMinorOverride ? Math.round(Number(priceMinorOverride) * 100) : undefined,
          stockQuantity: Number(stockQuantity),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Variant added");
        onSaved();
      } else {
        toast.error(json.error?.message || "Failed to add variant");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Variant</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-medium text-gray-700">Attributes</label>
          {attrRows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                placeholder="Attribute (e.g. Color)"
                value={row.key}
                onChange={(e) => updateRow(i, "key", e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <input
                placeholder="Value (e.g. Red)"
                value={row.value}
                onChange={(e) => updateRow(i, "value", e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              {attrRows.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="text-red-600">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRow} className="text-sm text-blue-600 hover:underline">
            + Add another attribute
          </button>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input type="number" placeholder="Price override (KES)" value={priceMinorOverride} onChange={(e) => setPriceMinorOverride(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <input type="number" placeholder="Stock" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
            {saving ? "Saving..." : "Add Variant"}
          </button>
        </form>
      </div>
    </div>
  );
}