"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Plus, ShieldCheck } from "lucide-react";
import { categories, vehicleMakes } from "@/data/sampleData";
import { getCurrentSellerStore } from "@/data/sellerData";
import { useToast } from "@/contexts/ToastContext";

export default function NewListingPage() {
  const router = useRouter();
  const toast = useToast();
  const store = getCurrentSellerStore();

  const [sellingAs, setSellingAs] = useState(store.sellerType); // "individual" | "business"
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("new");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [description, setDescription] = useState("");
  const [imageNames, setImageNames] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [fittingInstructions, setFittingInstructions] = useState("");
  const [tools, setTools] = useState([""]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleDraft, setVehicleDraft] = useState({ make: "", model: "", year: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length + imageNames.length > 8) {
      toast.error("Maximum 8 images per listing");
      return;
    }
    setImageNames((prev) => [...prev, ...files.map((f) => f.name)]);
  }

  function removeImage(name) {
    setImageNames((prev) => prev.filter((n) => n !== name));
  }

  function updateTool(i, value) {
    setTools((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }
  function addToolField() {
    setTools((prev) => [...prev, ""]);
  }
  function removeToolField(i) {
    setTools((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addVehicle() {
    const { make, model, year } = vehicleDraft;
    if (!make || !model || !year) return;
    setVehicles((prev) => [...prev, `${make} ${model} (${year})`]);
    setVehicleDraft({ make: "", model: "", year: "" });
  }
  function removeVehicle(v) {
    setVehicles((prev) => prev.filter((x) => x !== v));
  }

  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Enter a product name";
    if (!categoryId) errs.categoryId = "Select a category";
    if (!price || Number(price) <= 0) errs.price = "Enter a valid price";
    if (imageNames.length === 0) errs.images = "Add at least one photo";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    // Replace with POST /api/v1/products (Document 3, §3.1). Images would
    // be uploaded to Cloudinary/S3 first (Document 1's storage layer) and
    // their URLs included here, not raw files — this mock only tracks
    // filenames since there's no real upload target yet.
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);

    toast.success(`"${name}" is now live on AutoSoko`);
    router.push("/seller/listings");
  }

  const years = Array.from({ length: 20 }, (_, i) => 2025 - i);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl mb-1">Create Listing</h1>
      <p className="text-sm text-muted mb-8">
        Sell as an individual or on behalf of a registered business — both are welcome on AutoSoko.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        {/* Selling as */}
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-3">Selling As</h2>
          <div className="flex gap-3">
            {["individual", "business"].map((type) => (
              <label
                key={type}
                className={`flex-1 flex items-center gap-2 border rounded-sm px-3.5 py-2.5 text-sm cursor-pointer capitalize ${
                  sellingAs === type ? "border-fg bg-fg text-bg" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="sellingAs"
                  value={type}
                  checked={sellingAs === type}
                  onChange={() => setSellingAs(type)}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted mt-3">
            <ShieldCheck size={13} className="shrink-0 mt-0.5" />
            Your listing goes live immediately. The "Verified" trust badge
            appears once your identity (individuals) or business documents
            are reviewed by an AutoSoko agent.
          </p>
        </div>

        {/* Basics */}
        <div className="bg-card border border-line rounded-md p-5 space-y-4">
          <h2 className="font-display text-base">Product Details</h2>

          <div>
            <label className="block text-xs text-muted mb-1.5">Product Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front Brake Pads — Toyota Corolla (2016–2019)"
              className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg ${
                errors.name ? "border-fg" : "border-line"
              }`}
            />
            {errors.name && <p className="text-xs mt-1 font-semibold">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg ${
                  errors.categoryId ? "border-fg" : "border-line"
                }`}
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs mt-1 font-semibold">{errors.categoryId}</p>}
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Price (KES)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-full border rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg ${
                  errors.price ? "border-fg" : "border-line"
                }`}
              />
              {errors.price && <p className="text-xs mt-1 font-semibold">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Stock Quantity</label>
              <input
                type="number"
                min="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg resize-none"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-1">Photos</h2>
          <p className="text-xs text-muted mb-3">
            Add up to 8 photos. Listings with multiple angles sell faster.
          </p>

          <label className="flex items-center gap-2 border border-dashed border-line rounded-sm px-4 py-3 text-sm cursor-pointer hover:border-fg transition-colors w-fit">
            <Upload size={15} />
            Add Photos
            <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </label>
          {errors.images && <p className="text-xs mt-2 font-semibold">{errors.images}</p>}

          {imageNames.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-3">
              {imageNames.map((n) => (
                <li key={n} className="flex items-center gap-1.5 text-xs border border-line rounded-sm px-2.5 py-1.5">
                  {n}
                  <button type="button" onClick={() => removeImage(n)} aria-label={`Remove ${n}`}>
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fitting guide (optional) */}
        <div className="bg-card border border-line rounded-md p-5 space-y-4">
          <div>
            <h2 className="font-display text-base">Fitting Guide (Optional)</h2>
            <p className="text-xs text-muted mt-1">
              Not every product needs one — add these only if relevant.
            </p>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">YouTube Tutorial Link</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Fitting Instructions</label>
            <textarea
              value={fittingInstructions}
              onChange={(e) => setFittingInstructions(e.target.value)}
              rows={4}
              placeholder="1. Jack up the vehicle...&#10;2. Remove the wheel..."
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Tools Needed</label>
            <div className="space-y-2">
              {tools.map((tool, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={tool}
                    onChange={(e) => updateTool(i, e.target.value)}
                    placeholder="e.g. 14mm socket"
                    className="flex-1 border border-line rounded-sm px-3 py-2 text-sm bg-bg focus:outline-none focus:border-fg"
                  />
                  {tools.length > 1 && (
                    <button type="button" onClick={() => removeToolField(i)} aria-label="Remove tool">
                      <X size={14} className="text-muted" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addToolField}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-fg"
              >
                <Plus size={13} /> Add another tool
              </button>
            </div>
          </div>
        </div>

        {/* Compatible vehicles */}
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-1">Compatible Vehicles (Optional)</h2>
          <p className="text-xs text-muted mb-3">
            Skip this for universal items like tools or accessories.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {vehicles.map((v) => (
              <span key={v} className="flex items-center gap-1.5 text-xs border border-line rounded-sm px-2.5 py-1.5">
                {v}
                <button type="button" onClick={() => removeVehicle(v)} aria-label={`Remove ${v}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={vehicleDraft.make}
              onChange={(e) => setVehicleDraft((v) => ({ ...v, make: e.target.value }))}
              className="flex-1 border border-line rounded-sm px-2.5 py-2 text-sm bg-bg focus:outline-none focus:border-fg"
            >
              <option value="">Make</option>
              {vehicleMakes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={vehicleDraft.model}
              onChange={(e) => setVehicleDraft((v) => ({ ...v, model: e.target.value }))}
              disabled={!vehicleDraft.make}
              className="flex-1 border border-line rounded-sm px-2.5 py-2 text-sm bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
            >
              <option value="">Model</option>
              <option value="Corolla">Corolla</option>
              <option value="Hilux">Hilux</option>
            </select>
            <select
              value={vehicleDraft.year}
              onChange={(e) => setVehicleDraft((v) => ({ ...v, year: e.target.value }))}
              disabled={!vehicleDraft.model}
              className="flex-1 border border-line rounded-sm px-2.5 py-2 text-sm bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
            >
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addVehicle}
              className="border border-line rounded-sm px-3 py-2 text-sm hover:bg-bg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-sm py-3.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Publishing..." : "Publish Listing"}
        </button>
      </form>
    </div>
  );
}
