"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import DetailsTab from "./DetailsTab";
import ImagesTab from "./ImagesTab";
import CompatibilityTab from "./CompatibilityTab";
import VariantsTab from "./VariantsTab";
import DocumentsTab from "./DocumentsTab";

const TABS = [
  { id: "details", label: "Details" },
  { id: "images", label: "Images" },
  { id: "compatibility", label: "Compatibility" },
  { id: "variants", label: "Variants" },
  { id: "documents", label: "Documents" },
];

export default function SellerListingDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const toast = useToast();

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/products/${productId}`);
      const json = await res.json();
      if (json.success) setProduct(json.data);
      else toast.error(json.error?.message || "Failed to load listing");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;
  if (!product) return <p className="text-sm text-gray-500">Listing not found.</p>;

  return (
    <div>
      <Link href="/seller/listings" className="inline-flex items-center gap-2 text-sm text-blue-600 mb-4">
        <ArrowLeft size={16} /> All Listings
      </Link>

      <div className="flex items-center gap-3 mb-6">
        {product.images?.[0]?.url ? (
          <img src={product.images[0].url} alt="" className="w-12 h-12 rounded-md object-cover border border-gray-200" />
        ) : (
          <div className="w-12 h-12 rounded-md bg-gray-100" />
        )}
        <div>
          <h1 className="font-display text-2xl">{product.name}</h1>
          <p className="text-sm text-muted">KES {(product.priceMinor / 100).toLocaleString()} · {product.category?.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "details" && <DetailsTab product={product} onUpdate={fetchProduct} />}
      {activeTab === "images" && <ImagesTab productId={product.id} images={product.images} onUpdate={fetchProduct} />}
      {activeTab === "compatibility" && <CompatibilityTab productId={product.id} compatibility={product.compatibility} onUpdate={fetchProduct} />}
      {activeTab === "variants" && <VariantsTab productId={product.id} variants={product.variants} onUpdate={fetchProduct} />}
      {activeTab === "documents" && <DocumentsTab productId={product.id} documents={product.documents} onUpdate={fetchProduct} />}
    </div>
  );
}