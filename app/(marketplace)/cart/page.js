"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingCart, Loader2, LogIn } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/sampleData";

export default function CartPage() {
  const { data: session, status } = useSession();
  const cart = useCart();

  // While session is loading, show a spinner
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your cart…</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login prompt
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-display text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-sm text-gray-500 mb-6">
            Please sign in to view your cart and continue checkout.
          </p>
          <Link
            href="/auth/login?callbackUrl=/cart"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold px-6 py-3 rounded-md transition-colors"
          >
            <LogIn size={16} />
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // Authenticated user: show cart content
  if (cart.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <ShoppingCart size={36} className="mx-auto mb-4 text-gray-400" />
        <h1 className="font-display text-xl mb-2">Your cart is empty</h1>
        <p className="text-sm text-gray-500 mb-6">
          Browse parts and add items to get started.
        </p>
        <Link
          href="/search"
          className="inline-block bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
        >
          Browse Parts
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-1">Your Cart</h1>
      <p className="text-sm text-gray-500 mb-8">
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
            <div key={group.storeId} className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-800">
                {group.storeName}
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 px-4 py-4">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm font-mono text-gray-500 mt-1">
                        {formatPrice(item.priceMinor, item.currency)}
                      </p>
                    </div>
                    <div className="flex items-center border border-gray-200 rounded-md shrink-0">
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-3 text-sm font-mono w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      onClick={() => cart.removeItem(item.productId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-between text-sm">
                <span className="text-gray-500">Subtotal from {group.storeName}</span>
                <span className="font-mono font-medium text-gray-900">{formatPrice(subtotal, "KES")}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-gray-200 rounded-md p-5 mt-6 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Order Total</p>
          <p className="font-display text-xl text-gray-900">{formatPrice(cart.grandTotalMinor, "KES")}</p>
          <p className="text-xs text-gray-500 mt-0.5">Delivery calculated at checkout</p>
        </div>
        <Link
          href="/checkout"
          className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 text-sm font-semibold px-6 py-3 rounded-md transition-colors"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}