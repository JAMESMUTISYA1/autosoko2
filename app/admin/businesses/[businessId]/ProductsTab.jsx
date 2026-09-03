"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Eye, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function ProductsTab({ businessId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  

  useEffect(() => {
    fetchProducts();
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${businessId}/products`);
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openProduct(product) {
    setSelectedProduct(product);
    setShowProductModal(true);
  }

  function openCreate() {
    setEditingProduct(null);
    setShowCreateModal(true);
  }

  function openEdit(product) {
    setEditingProduct(product);
    setShowCreateModal(true);
  }

  async function handleDeleteProduct(productId) {
    if (!confirm("Delete this product?")) return;
    // Individual product GET/PATCH/DELETE stay on the existing
    // /api/v1/admin/products/:id route — that one is already keyed by
    // product id alone, so it didn't need generalizing.
    await fetch(`/api/v1/admin/products/${productId}`, { method: "DELETE" });
    fetchProducts();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Products</h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-blue-600" size={32} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="aspect-square bg-gray-100 relative">
                {p.images?.[0]?.url ? (
                  <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium line-clamp-1">{p.name}</h3>
                <p className="text-xs text-gray-500">KES {(p.priceMinor / 100).toLocaleString()}</p>
                <div className="flex justify-between mt-2">
                  <button onClick={() => openProduct(p)} className="text-blue-600"><Eye size={16} /></button>
                  <button onClick={() => openEdit(p)} className="text-yellow-600"><Pencil size={16} /></button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-sm text-gray-500 col-span-full">No products yet.</p>}
        </div>
      )}

      {showProductModal && selectedProduct && (
        <ProductDetailModal productId={selectedProduct.id} onClose={() => setShowProductModal(false)} />
      )}

      {showCreateModal && (
        <ProductFormModal
          businessId={businessId}
          editingProduct={editingProduct}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

function ProductDetailModal({ productId, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/admin/products/${productId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProduct(json.data);
        setLoading(false);
      });
  }, [productId]);

  if (loading) return <Loader2 className="animate-spin" />;
  if (!product) return <p>Product not found.</p>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Product Details</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Images</h4>
            <div className="grid grid-cols-2 gap-2">
              {product.images?.map((img) => (
                <img key={img.id} src={img.url} alt={product.name} className="rounded-md object-cover aspect-square" />
              ))}
              {!product.images?.length && <p className="text-sm text-gray-500">No images.</p>}
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <p><strong>Name:</strong> {product.name}</p>
            <p><strong>SKU:</strong> {product.sku || "—"}</p>
            <p><strong>Price:</strong> KES {(product.priceMinor / 100).toLocaleString()}</p>
            <p><strong>Wholesale Price:</strong> {product.wholesalePriceMinor ? `KES ${(product.wholesalePriceMinor / 100).toLocaleString()}` : "—"}</p>
            <p><strong>Stock:</strong> {product.stockQuantity}</p>
            <p><strong>Condition:</strong> {product.condition}</p>
            <p><strong>Status:</strong> {product.status}</p>
            <p><strong>Brand:</strong> {product.brand || "—"}</p>
            <p><strong>Manufacturer:</strong> {product.manufacturer || "—"}</p>
            <p><strong>OEM Number:</strong> {product.oemNumber || "—"}</p>
            <p><strong>Part Number:</strong> {product.partNumber || "—"}</p>
            <p><strong>Barcode:</strong> {product.barcode || "—"}</p>
            <p><strong>MOQ:</strong> {product.moq}</p>
            <p><strong>Warranty:</strong> {product.warrantyMonths ? `${product.warrantyMonths} months` : "—"}</p>
            <p><strong>Weight:</strong> {product.weightGrams ? `${product.weightGrams} g` : "—"}</p>
            <p><strong>Dimensions:</strong> {product.lengthMm ? `${product.lengthMm}×${product.widthMm}×${product.heightMm} mm` : "—"}</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Description</h4>
          <p className="text-sm text-gray-600">{product.longDescription || product.shortDescription || "—"}</p>
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Compatibility</h4>
          {product.compatibility?.length > 0 ? (
            <ul className="list-disc pl-5 text-sm">
              {product.compatibility.map((c, idx) => (
                <li key={idx}>{c.make} {c.model} {c.generation} — {c.trimName}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No compatibility data.</p>
          )}
        </div>

        <div className="mt-4">
          <h4 className="font-medium">Guides & Tools</h4>
          {product.youtubeUrl && (
            <p><a href={product.youtubeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{product.youtubeUrl}</a></p>
          )}
          {product.fittingInstructions && <p className="text-sm text-gray-600">{product.fittingInstructions}</p>}
          {product.toolsNeeded?.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Tools:</span> {product.toolsNeeded.join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductFormModal({ businessId, editingProduct, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editingProduct?.name || "",
    priceMinor: editingProduct?.priceMinor ? (editingProduct.priceMinor / 100).toString() : "",
    stockQuantity: editingProduct?.stockQuantity?.toString() || "0",
    condition: editingProduct?.condition || "new",
    status: editingProduct?.status || "active",
    trackInventory: editingProduct?.trackInventory ?? true,
    brand: editingProduct?.brand || "",
    manufacturer: editingProduct?.manufacturer || "",
    oemNumber: editingProduct?.oemNumber || "",
    partNumber: editingProduct?.partNumber || "",
    sku: editingProduct?.sku || "",
    barcode: editingProduct?.barcode || "",
    wholesalePriceMinor: editingProduct?.wholesalePriceMinor ? (editingProduct.wholesalePriceMinor / 100).toString() : "",
    moq: editingProduct?.moq?.toString() || "1",
    warrantyMonths: editingProduct?.warrantyMonths?.toString() || "",
    weightGrams: editingProduct?.weightGrams?.toString() || "",
    lengthMm: editingProduct?.lengthMm?.toString() || "",
    widthMm: editingProduct?.widthMm?.toString() || "",
    heightMm: editingProduct?.heightMm?.toString() || "",
    youtubeUrl: editingProduct?.youtubeUrl || "",
    fittingInstructions: editingProduct?.fittingInstructions || "",
    toolsNeeded: Array.isArray(editingProduct?.toolsNeeded) ? editingProduct.toolsNeeded.join(", ") : "",
    sponsored: editingProduct?.sponsored ?? false,
    shortDescription: editingProduct?.shortDescription || "",
    longDescription: editingProduct?.longDescription || "",
    categoryId: editingProduct?.category?.id || "",
    compatibleTrims: editingProduct?.compatibility?.map((c) => c.trimId) || [],
  });

  const [categories, setCategories] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((json) => { if (json.success) setCategories(json.data); })
      .catch(() => {});
    fetch("/api/v1/vehicle-data?type=makes")
      .then((r) => r.json())
      .then((json) => { if (json.success) setMakes(json.data); })
      .catch(() => {});
  }, []);

  async function fetchModels(makeId) {
    const res = await fetch(`/api/v1/vehicle-data?type=models&parentId=${makeId}`);
    const json = await res.json();
    if (json.success) setModels(json.data);
  }

  async function fetchTrims(modelId) {
    const res = await fetch(`/api/v1/vehicle-data?type=trims&parentId=${modelId}`);
    const json = await res.json();
    if (json.success) setTrims(json.data);
  }

  function handleMakeChange(e) {
    const makeId = e.target.value;
    setSelectedMake(makeId);
    setSelectedModel("");
    setModels([]);
    setTrims([]);
    if (makeId) fetchModels(makeId);
  }

  function handleModelChange(e) {
    const modelId = e.target.value;
    setSelectedModel(modelId);
    setTrims([]);
    if (modelId) fetchTrims(modelId);
  }

  function toggleTrim(trimId) {
    setForm((prev) => {
      const exists = prev.compatibleTrims.includes(trimId);
      return {
        ...prev,
        compatibleTrims: exists ? prev.compatibleTrims.filter((id) => id !== trimId) : [...prev.compatibleTrims, trimId],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

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
      toolsNeeded: form.toolsNeeded ? form.toolsNeeded.split(",").map((s) => s.trim()) : [],
      compatibleTrims: form.compatibleTrims,
    };

    const url = editingProduct
      ? `/api/v1/admin/products/${editingProduct.id}`
      : `/api/v1/admin/businesses/${businessId}/products`;
    const method = editingProduct ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingProduct ? "Product updated" : "Product created");
        onSaved();
      } else {
        toast.error(json.error?.message || "Operation failed");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{editingProduct ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Price (KES) *</label>
              <input type="number" value={form.priceMinor} onChange={(e) => setForm({ ...form, priceMinor: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Wholesale Price (KES)</label>
              <input type="number" value={form.wholesalePriceMinor} onChange={(e) => setForm({ ...form, wholesalePriceMinor: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Stock Quantity *</label>
              <input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">MOQ</label>
              <input type="number" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
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
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Track Inventory</label>
              <input type="checkbox" checked={form.trackInventory} onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })} className="h-4 w-4 text-blue-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Brand</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Manufacturer</label>
              <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">OEM Number</label>
              <input value={form.oemNumber} onChange={(e) => setForm({ ...form, oemNumber: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Part Number</label>
              <input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Barcode</label>
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Weight (g)</label>
              <input type="number" value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Length (mm)</label>
              <input type="number" value={form.lengthMm} onChange={(e) => setForm({ ...form, lengthMm: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Width (mm)</label>
              <input type="number" value={form.widthMm} onChange={(e) => setForm({ ...form, widthMm: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Height (mm)</label>
              <input type="number" value={form.heightMm} onChange={(e) => setForm({ ...form, heightMm: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Warranty (months)</label>
              <input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
              <option value="">Select category</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Short Description</label>
            <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Long Description</label>
            <textarea value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} rows={4} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">YouTube URL</label>
              <input value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Fitting Instructions</label>
              <textarea value={form.fittingInstructions} onChange={(e) => setForm({ ...form, fittingInstructions: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tools Needed (comma separated)</label>
              <input value={form.toolsNeeded} onChange={(e) => setForm({ ...form, toolsNeeded: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.sponsored} onChange={(e) => setForm({ ...form, sponsored: e.target.checked })} className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">Sponsored</span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Compatible Vehicles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={selectedMake} onChange={handleMakeChange} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Select Make</option>
                {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={selectedModel} onChange={handleModelChange} disabled={!selectedMake} className="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
                <option value="">Select Model</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="sm:col-span-1">
                <span className="text-xs text-gray-500">Select trims below</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {trims.map((trim) => (
                <label key={trim.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.compatibleTrims.includes(trim.id)}
                    onChange={() => toggleTrim(trim.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                  {trim.name}
                </label>
              ))}
            </div>
            {editingProduct && editingProduct.compatibility?.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Existing: {editingProduct.compatibility.map((c) => c.trimName).join(", ")}
              </p>
            )}
          </div>

          <button type="submit" disabled={saving} className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60">
            {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
          </button>
        </form>
      </div>
    </div>
  );
}