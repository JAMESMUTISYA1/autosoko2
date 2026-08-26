"use client";
export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/sampleData";

export default function CartPage() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <ShoppingCart size={36} className="mx-auto mb-4 text-muted" />
        <h1 className="font-display text-xl mb-2">Your cart is empty</h1>
        <p className="text-sm text-muted mb-6">
          Browse parts and add items to get started.
        </p>
        <Link
          href="/search"
          className="inline-block bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90"
        >
          Browse Parts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-1">Your Cart</h1>
      <p className="text-sm text-muted mb-8">
        {cart.groupedByStore.length > 1
          ? `Items from ${cart.groupedByStore.length} sellers will be placed as separate orders.`
          : "Review your items before checkout."}
      </p>

      <div className="space-y-6">
        {cart.groupedByStore.map((group) => {
          const subtotal = group.items.reduce(
            (sum, i) => sum + i.priceMinor * i.quantity,
            0
          );
          return (
            <div key={group.storeId} className="border border-line rounded-md overflow-hidden">
              <div className="px-4 py-3 bg-card border-b border-line text-sm font-medium">
                {group.storeName}
              </div>
              <div className="divide-y divide-line">
                {group.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 px-4 py-4">
                    <div className="relative w-16 h-16 rounded-sm overflow-hidden border border-line shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-sm font-medium hover:underline line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm font-mono text-muted mt-1">
                        {formatPrice(item.priceMinor, item.currency)}
                      </p>
                    </div>
                    <div className="flex items-center border border-line rounded-sm shrink-0">
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="p-2 hover:bg-bg"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-3 text-sm font-mono w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="p-2 hover:bg-bg"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      onClick={() => cart.removeItem(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-muted hover:text-fg shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-card border-t border-line flex justify-between text-sm">
                <span className="text-muted">Subtotal from {group.storeName}</span>
                <span className="font-mono font-medium">{formatPrice(subtotal, "KES")}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-fg rounded-md p-5 mt-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider">Order Total</p>
          <p className="font-display text-xl">{formatPrice(cart.grandTotalMinor, "KES")}</p>
          <p className="text-xs text-muted mt-0.5">Delivery calculated at checkout</p>
        </div>
        <Link
          href="/checkout"
          className="bg-accent text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-accent/90 transition-colors"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
