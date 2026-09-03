// PATH: components/ProductReviews.js

import { Star, BadgeCheck } from "lucide-react";

export default function ProductReviews({ ratingAvg, reviewCount, reviews = [] }) {
  if (reviewCount === 0) {
    return (
      <div className="mt-10">
        <h2 className="font-display text-lg mb-3">Reviews</h2>
        <p className="text-sm text-muted">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-display text-lg">Reviews</h2>
        <span className="flex items-center gap-1 text-sm text-muted">
          <Star size={14} className="fill-fg text-fg" />
          {ratingAvg.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="border border-line rounded-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm">
                  <Star size={13} className="fill-fg text-fg" />
                  {r.rating}
                </span>
                <span className="text-sm font-medium">{r.buyer.fullName}</span>
                {r.isVerifiedPurchase && (
                  <span className="flex items-center gap-0.5 text-[11px] text-muted">
                    <BadgeCheck size={12} /> Verified Purchase
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.title && <p className="text-sm font-medium mt-2">{r.title}</p>}
            {r.body && <p className="text-sm text-muted mt-1 leading-relaxed">{r.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}