"use client";

import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext(null);
const STORAGE_KEY = "autosoko-wishlist";

export function WishlistProvider({ children }) {
  const [productIds, setProductIds] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProductIds(JSON.parse(stored));
    } catch {
      // Start empty if storage is corrupt/unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
    } catch {
      // Non-fatal — wishlist still works for this session.
    }
  }, [productIds, hydrated]);

  function isSaved(productId) {
    return productIds.includes(productId);
  }

  function toggle(productId) {
    setProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    return !productIds.includes(productId); // returns the new saved state
  }

  return (
    <WishlistContext.Provider value={{ productIds, isSaved, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
