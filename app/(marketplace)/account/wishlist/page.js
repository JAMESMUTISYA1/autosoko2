"use client";
export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard from "@/components/ProductCard";

export default function WishlistPage() {
  const { products, loading } = useWishlist();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading wishlist…</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Heart size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-display text-gray-900 mb-2">Your wishlist is empty</h1>
          <p className="text-sm text-gray-500 mb-6">
            Tap the heart on any listing to save it here for later.
          </p>
          <Link
            href="/search"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold px-6 py-3 rounded-md transition-colors"
          >
            Browse Parts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display text-gray-900">Wishlist</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} saved item{products.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}