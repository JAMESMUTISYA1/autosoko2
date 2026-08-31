"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import ProductForm from "@/components/seller/ProductForm";

export default function NewListingPage() {
  const router = useRouter();
  const toast = useToast();

  async function handleCreate(payload) {
    const res = await fetch("/api/v1/seller/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Listing created — now add photos and other details");
      router.push(`/seller/listings/${json.data.id}`);
    } else {
      toast.error(json.error?.message || "Failed to create listing");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl mb-1">Create Listing</h1>
      <p className="text-sm text-muted mb-6">
        Fill in the basics now — you'll add photos, compatible vehicles, and variants on the next screen.
      </p>
      <ProductForm onSubmit={handleCreate} submitLabel="Create Listing" />
    </div>
  );
}