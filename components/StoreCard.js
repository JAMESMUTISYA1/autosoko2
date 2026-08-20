import Link from "next/link";
import { BadgeCheck, MapPin, Star, User, Store as StoreIcon } from "lucide-react";

export default function StoreCard({ store, compact = false }) {
  return (
    <Link
      href={`/store/${store.slug}`}
      className={`flex items-center gap-3 border border-line rounded-md hover:border-fg transition-colors ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="w-11 h-11 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm shrink-0">
        {store.name.charAt(0)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{store.name}</span>
          {store.verified && <BadgeCheck size={14} className="text-fg shrink-0" />}
        </div>
        <div className="flex items-center gap-2.5 text-xs text-muted mt-0.5">
          <span className="flex items-center gap-1">
            {store.sellerType === "individual" ? <User size={11} /> : <StoreIcon size={11} />}
            {store.sellerType === "individual" ? "Individual Seller" : "Business"}
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} className="fill-fg text-fg" />
            {store.rating} ({store.ratingCount})
          </span>
        </div>
      </div>
    </Link>
  );
}
