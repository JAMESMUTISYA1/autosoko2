// PATH: components/SellerCard.js

"use client";

import { useRouter } from "next/navigation";
import { BadgeCheck, MapPin, MessageCircle, Phone, User, Store as StoreIcon } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

// CHANGED: `store` is now the real `business` object returned by
// lib/publicProducts.js (id, slug, name, businessType, logoUrl,
// verificationStatus, ratingAvg, ratingCount, town, country, phone,
// whatsapp) instead of the mock store shape (verified: boolean,
// sellerType: string, location: string, rating: number).
export default function SellerCard({ product, store }) {
  const router = useRouter();
  const toast = useToast();

  const isVerified = store.verificationStatus === "verified";
  const isIndividual = store.businessType === "individual_seller";
  const location = [store.town?.name, store.country?.name].filter(Boolean).join(", ") || "Location not set";

  function handleMessage() {
    // Messaging happens entirely in-platform — this never exposes a phone
    // number or hands off to WhatsApp/SMS. STILL PENDING: no
    // POST /api/v1/conversations exists yet in what's been built so far.
    // This route push assumes that endpoint (or an equivalent) exists on
    // the /account/messages/:businessId page to start/find the thread —
    // share that page's code if it expects something different.
    router.push(`/account/messages/${store.id}?product=${product.slug}`);
  }

  return (
    <div className="border border-line rounded-md p-5">
      <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Sold By</h3>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm shrink-0 overflow-hidden">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            store.name.charAt(0)
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{store.name}</span>
            {isVerified && (
              <span className="flex items-center gap-0.5 text-[11px] border border-fg rounded-sm px-1.5 py-0.5">
                <BadgeCheck size={11} />
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted mt-0.5">
            <span className="flex items-center gap-1">
              {isIndividual ? <User size={11} /> : <StoreIcon size={11} />}
              {isIndividual ? "Individual Seller" : "Business"}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {location}
            </span>
          </div>
          {store.ratingCount > 0 && (
            <p className="text-xs text-muted mt-0.5">
              {store.ratingAvg.toFixed(1)} ★ ({store.ratingCount} rating{store.ratingCount === 1 ? "" : "s"})
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          onClick={handleMessage}
          className="flex items-center justify-center gap-1.5 border border-fg text-fg text-sm font-medium py-2.5 rounded-sm hover:bg-fg hover:text-bg transition-colors"
        >
          <MessageCircle size={15} /> Message
        </button>
        <button
          type="button"
          onClick={() => toast.info("Sign in to reveal contact details")}
          className="flex items-center justify-center gap-1.5 border border-line text-fg text-sm font-medium py-2.5 rounded-sm hover:bg-bg transition-colors"
        >
          <Phone size={15} /> Call
        </button>
      </div>
      <p className="text-[11px] text-muted mt-2.5">
        All messages stay on AutoSoko — never share payment details outside checkout.
      </p>
    </div>
  );
}