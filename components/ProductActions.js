"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Truck, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useCart } from "@/contexts/CartContext";

export default function ProductActions({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(null); // "cart" | "buy" | null
  const toast = useToast();
  const cart = useCart();
  const router = useRouter();

  async function handleAddToCart() {
    setPending("cart");
    // Simulated network round-trip — replace with POST /api/v1/cart/items (Document 3)
    await new Promise((r) => setTimeout(r, 500));
    cart.addItem(product, quantity);
    setPending(null);
    toast.success(`Added ${quantity} × ${product.name} to cart`);
  }

  async function handleBuyNow() {
    setPending("buy");
    await new Promise((r) => setTimeout(r, 500));
    cart.addItem(product, quantity);
    setPending(null);
    router.push("/checkout");
  }

  return (
    <>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-muted">Quantity</span>
        <div className="flex items-center border border-line rounded-sm">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
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
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Increase quantity"
            className="p-2 hover:bg-bg"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-xs text-fg">In stock</span>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={pending !== null}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-70 transition-colors text-white font-semibold text-sm py-3 rounded-sm"
      >
        {pending === "cart" && <Loader2 size={16} className="animate-spin" />}
        {pending === "cart" ? "Adding..." : "Add to Cart"}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        disabled={pending !== null}
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
