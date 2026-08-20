import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/data/sampleData";

export default function BoughtTogether({ mainProduct, items }) {
  if (!items?.length) return null;

  const bundleTotal =
    mainProduct.priceMinor + items.reduce((sum, p) => sum + p.priceMinor, 0);

  return (
    <div className="mt-10 border border-line rounded-md p-5">
      <h2 className="font-display text-lg mb-4">Frequently Bought Together</h2>

      <div className="flex flex-wrap items-center gap-3">
        {[mainProduct, ...items].map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            {i > 0 && <span className="text-muted text-lg">+</span>}
            <Link href={`/product/${p.slug}`} className="flex items-center gap-2.5 group">
              <div className="relative w-14 h-14 rounded-sm overflow-hidden border border-line shrink-0">
                <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
              </div>
              <div className="max-w-[140px]">
                <p className="text-xs group-hover:underline line-clamp-2">{p.name}</p>
                <p className="text-xs text-muted font-mono">
                  {formatPrice(p.priceMinor, p.currency)}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
        <span className="text-sm">
          Buy all {items.length + 1} items:{" "}
          <span className="font-mono font-semibold">
            {formatPrice(bundleTotal, mainProduct.currency)}
          </span>
        </span>
        <button className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors">
          Add All to Cart
        </button>
      </div>
    </div>
  );
}
