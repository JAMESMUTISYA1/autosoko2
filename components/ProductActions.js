// PATH: components/ProductActions.js

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Truck, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useCart } from "@/contexts/CartContext";

export default function ProductActions({ product, inStock }) {
  const hasVariants = Boolean(product.variants?.length);
  const [selectedVariantId, setSelectedVariantId] = useState(hasVariants ? product.variants[0].id : null);
  const selectedVariant = hasVariants ? product.variants.find((v) => v.id === selectedVariantId) : null;

  // NEW: price and available stock now come from the selected variant when
  // one exists (variant.priceMinorOverride / variant.stockQuantity),
  // falling back to the product-level fields when it doesn't. The
  // original component had no concept of variants at all.
  const activePriceMinor = selectedVariant?.priceMinorOverride ?? product.priceMinor;
  const availableStock = !product.trackInventory
    ? Infinity
    : selectedVariant
    ? selectedVariant.stockQuantity
    : product.stockQuantity;
  const canOrder = inStock && availableStock > 0;

  const [quantity, setQuantity] = useState(Math.max(1, product.moq || 1));
  const [pending, setPending] = useState(null); // "cart" | "buy" | null
  const toast = useToast();
  const cart = useCart();
  const router = useRouter();

  const maxQuantity = useMemo(
    () => (availableStock === Infinity ? 999 : Math.max(product.moq || 1, availableStock)),
    [availableStock, product.moq]
  );

  async function handleAddToCart() {
    // STILL A STUB — no POST /api/v1/cart/items exists yet in what's been
    // built so far. If you already have a cart API, share it and I'll wire
    // this up for real instead of the setTimeout simulation.
    setPending("cart");
    await new Promise((r) => setTimeout(r, 500));
    cart.addItem({ ...product, priceMinor: activePriceMinor, variantId: selectedVariantId }, quantity);
    setPending(null);
    toast.success(`Added ${quantity} × ${product.name} to cart`);
  }

  async function handleBuyNow() {
    setPending("buy");
    await new Promise((r) => setTimeout(r, 500));
    cart.addItem({ ...product, priceMinor: activePriceMinor, variantId: selectedVariantId }, quantity);
    setPending(null);
    router.push("/checkout");
  }

  return (
    <>
      {hasVariants && (
        <div className="mt-4">
          <span className="text-sm text-muted block mb-1.5">Options</span>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const label = Object.values(v.attributes || {}).join(" / ") || "Option";
              const outOfStock = product.trackInventory && v.stockQuantity <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  disabled={outOfStock}
                  className={`text-sm px-3 py-1.5 rounded-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedVariantId === v.id ? "border-fg bg-fg text-bg" : "border-line hover:border-fg"
                  }`}
                >
                  {label}
                  {outOfStock && " (out of stock)"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-muted">Quantity</span>
        <div className="flex items-center border border-line rounded-sm">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(product.moq || 1, q - 1))}
            disabled={quantity <= (product.moq || 1)}
            aria-label="Decrease quantity"
            className="p-2 hover:bg-bg disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Minus size={14} />
          </button>
          <span className="px-3 text-sm font-mono w-8 text-center" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity}
            aria-label="Increase quantity"
            className="p-2 hover:bg-bg disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className={`text-xs ${canOrder ? "text-fg" : "text-red-600 font-medium"}`}>
          {canOrder ? "In stock" : "Out of stock"}
        </span>
      </div>
      {product.moq > 1 && <p className="text-xs text-muted mt-1">Minimum order: {product.moq} units</p>}

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={pending !== null || !canOrder}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-70 transition-colors text-white font-semibold text-sm py-3 rounded-sm"
      >
        {pending === "cart" && <Loader2 size={16} className="animate-spin" />}
        {pending === "cart" ? "Adding..." : "Add to Cart"}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={pending !== null || !canOrder}
        className="w-full mt-2 flex items-center justify-center gap-2 border border-fg text-fg text-sm font-medium py-3 rounded-sm hover:bg-fg hover:text-bg disabled:opacity-70 transition-colors"
      >
        {pending === "buy" && <Loader2 size={16} className="animate-spin" />}
        {pending === "buy" ? "Redirecting..." : "Buy Now"}
      </button>

      <div className="flex items-center gap-2 mt-4 text-xs text-muted">
        <Truck size={14} />
        Delivery available · Pickup from seller also offered
      </div>
    </>
  );
}