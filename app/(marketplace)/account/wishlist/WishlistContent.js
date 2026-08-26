// app/(marketplace)/account/wishlist/WishlistContent.js
"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { featuredProducts } from "@/data/sampleData";
import ProductCard from "@/components/ProductCard";

export default function WishlistContent() {
  const wishlist = useWishlist();
  const savedProducts = featuredProducts.filter((p) =>
    wishlist.productIds.includes(p.id)
  );

  if (savedProducts.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <Heart size={36} className="mx-auto mb-4 text-muted" />
        <h1 className="font-display text-xl mb-2">Your wishlist is empty</h1>
        <p className="text-sm text-muted mb-6">
          Tap the heart on any listing to save it here.
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
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-1">Wishlist</h1>
      <p className="text-sm text-muted mb-8">
        {savedProducts.length} saved items
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {savedProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}