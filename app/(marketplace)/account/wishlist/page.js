// app/(marketplace)/account/wishlist/page.js
import { Suspense } from "react";
import WishlistContent from "./WishlistContent";

export default function WishlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading wishlist…</div>}>
      <WishlistContent />
    </Suspense>
  );
}