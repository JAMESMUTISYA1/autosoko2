"use client";
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Heart, MapPin, Star, ShoppingCart, Loader2, Zap } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import { useToast } from "@/contexts/ToastContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import HighlightedText from "@/components/HighlightedText";
import { getFieldMatches } from "@/lib/search/highlight";

export default function ProductCard({ product }) {
  const toast = useToast();
  const wishlist = useWishlist();
  const cart = useCart();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);

  const cover = product.images?.[0] || product.image;
  const saved = wishlist.isSaved(product.id);
  const nameMatchIndices = getFieldMatches(product._matches, "name");

  function toggleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = wishlist.toggle(product.id);
    toast.success(nowSaved ? "Saved to wishlist" : "Removed from wishlist");
  }

  async function quickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    await new Promise((r) => setTimeout(r, 350));
    cart.addItem(product, 1);
    setAdding(false);
    toast.success("Added to cart");
  }

  async function buyNow(e) {
    e.preventDefault();
    e.stopPropagation();
    setBuying(true);
    cart.addItem(product, 1);
    await new Promise((r) => setTimeout(r, 200));
    setBuying(false);
    router.push("/checkout");
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block bg-white rounded-md border border-gray-300 overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <Image
          src={cover}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          <span
            className={`text-[11px] font-medium px-2 py-1 rounded-sm ${
              product.condition === "new"
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {product.condition === "new" ? "New" : "Used"}
          </span>
          {product.sponsored && (
            <span className="text-[11px] font-medium px-2 py-1 rounded-sm border border-gray-400 bg-white text-gray-700">
              Sponsored
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSave}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={saved}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/95 backdrop-blur flex items-center justify-center hover:bg-white transition-colors border border-gray-200"
        >
          <Heart
            size={14}
            className={saved ? "fill-red-500 text-red-500" : "text-gray-700"}
          />
        </button>
      </div>

      <div className="p-4">
        {/* Title */}
        <h3 className="text-sm text-gray-900 font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
          {nameMatchIndices ? (
            <HighlightedText text={product.name} indices={nameMatchIndices} />
          ) : (
            product.name
          )}
        </h3>

        {/* Price */}
        <div className="mt-2 inline-block bg-gray-900 text-white text-sm font-mono font-medium px-2 py-0.5 rounded-sm">
          {formatPrice(product.priceMinor, product.currency)}
        </div>

        {/* Seller */}
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-700">
          {product.sellerVerified && (
            <BadgeCheck size={13} className="text-blue-600 shrink-0" />
          )}
          <span className="truncate">{product.sellerName}</span>
        </div>

        {/* Location & rating */}
        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-700">
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-gray-700" />
            {product.location}
          </span>
          <span className="flex items-center gap-1">
            <Star size={12} className="text-yellow-500 fill-yellow-500" />
            <span className="text-gray-900">{product.rating}</span>
          </span>
        </div>

        {product.unitsSold > 0 && (
          <p className="text-[11px] text-gray-600 mt-1">{product.unitsSold} sold</p>
        )}

        {/* Action Buttons – side by side */}
        <div className="mt-3 flex gap-2">
          {/* Add to Cart */}
          <button
            type="button"
            onClick={quickAdd}
            disabled={adding}
            className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-xs font-semibold py-2 rounded-sm disabled:opacity-70 transition-colors"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
            {adding ? "Adding..." : "Add to Cart"}
          </button>

          {/* Buy Now */}
          <button
            type="button"
            onClick={buyNow}
            disabled={buying}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-sm disabled:opacity-70 transition-colors"
          >
            {buying ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            {buying ? "Processing..." : "Buy Now"}
          </button>
        </div>
      </div>
    </Link>
  );
}