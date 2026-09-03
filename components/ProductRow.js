// PATH: components/ProductRow.js
// No functional change — this already works with any array of
// product-like objects ({id, slug, name, images, priceMinor, ...}),
// which is exactly the shape getRelatedProducts() in lib/publicProducts.js
// returns. Kept as-is.

import Link from "next/link";
import ProductCard from "@/components/ProductCard";

export default function ProductRow({ title, viewAllHref, products }) {
  if (!products?.length) return null;

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-lg">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs text-muted hover:text-fg">
            View all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}