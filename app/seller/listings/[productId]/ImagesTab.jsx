"use client";

import { useRef, useState } from "react";
import { Loader2, Star, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const MAX_IMAGES = 10;

export default function ImagesTab({ productId, images = [], onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images per product`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/seller/products/${productId}/images`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        toast.success("Image uploaded");
        onUpdate();
      } else {
        toast.error(json.error?.message || "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  async function setPrimary(imageId) {
    const res = await fetch(`/api/v1/seller/products/${productId}/images/${imageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Primary image updated");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to update");
    }
  }

  async function move(image, direction) {
    const index = sorted.findIndex((i) => i.id === image.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;

    await Promise.all([
      fetch(`/api/v1/seller/products/${productId}/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swapWith.sortOrder }),
      }),
      fetch(`/api/v1/seller/products/${productId}/images/${swapWith.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: image.sortOrder }),
      }),
    ]);
    onUpdate();
  }

  async function handleDelete(imageId) {
    if (!confirm("Remove this image?")) return;
    const res = await fetch(`/api/v1/seller/products/${productId}/images/${imageId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Image removed");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to remove image");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Photos</h2>
          <p className="text-sm text-gray-500">Up to {MAX_IMAGES} images. The starred photo is shown first everywhere.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg py-10 text-center">
          No photos yet — upload at least one before making this listing active.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sorted.map((image, index) => (
            <div key={image.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <div className="aspect-square relative bg-gray-100">
                <img src={image.url} alt={image.altText || ""} className="w-full h-full object-cover" />
                {image.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 bg-yellow-400 text-blue-900 text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Star size={11} className="fill-blue-900" /> Primary
                  </span>
                )}
              </div>
              <div className="p-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <button onClick={() => move(image, -1)} disabled={index === 0} className="text-gray-500 disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(image, 1)} disabled={index === sorted.length - 1} className="text-gray-500 disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  {!image.isPrimary && (
                    <button onClick={() => setPrimary(image.id)} className="text-yellow-600" title="Set as primary">
                      <Star size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(image.id)} className="text-red-600" title="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}