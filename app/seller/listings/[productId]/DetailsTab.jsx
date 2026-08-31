"use client";

import { useToast } from "@/contexts/ToastContext";
import ProductForm from "@/components/seller/ProductForm";

export default function DetailsTab({ product, onUpdate }) {
  const toast = useToast();

  async function handleUpdate(payload) {
    const res = await fetch(`/api/v1/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Listing updated");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to update listing");
    }
  }

  return (
    <div className="max-w-3xl">
      <ProductForm initialProduct={product} onSubmit={handleUpdate} submitLabel="Save Changes" />
    </div>
  );
}