"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const WishlistContext = createContext(null);
const STORAGE_KEY = "autosoko-wishlist";

export function WishlistProvider({ children }) {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage (stores array of product objects)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProducts(JSON.parse(stored));
    } catch {
      // Start empty
    }
    setHydrated(true);
    setLoading(false);
  }, []);

  // Persist products to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch {
      // Non-fatal
    }
  }, [products, hydrated]);

  // When authenticated, fetch from server and replace local state
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    let active = true;
    async function fetchWishlist() {
      try {
        const res = await fetch("/api/v1/wishlist", { cache: "no-store" });
        const json = await res.json();
        if (active && json.success) {
          setProducts(json.data || []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data || []));
        }
      } catch (error) {
        console.warn("Failed to fetch wishlist from server:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchWishlist();
    return () => {
      active = false;
    };
  }, [status, session?.user]);

  const productIds = products.map((p) => p.id);

  function isSaved(productId) {
    return productIds.includes(productId);
  }

  async function toggle(productId, productObject = null) {
    const exists = products.some((p) => p.id === productId);
    const newSaved = !exists;

    // Optimistic update
    setProducts((prev) =>
      exists ? prev.filter((p) => p.id !== productId) : [...prev, productObject || { id: productId }]
    );

    if (session?.user) {
      try {
        if (newSaved) {
          const res = await fetch("/api/v1/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          if (!res.ok) throw new Error("Failed to save");
        } else {
          await fetch(`/api/v1/wishlist/${productId}`, { method: "DELETE" });
        }
        // Refresh from server to get full product data
        const refresh = await fetch("/api/v1/wishlist", { cache: "no-store" });
        const refreshJson = await refresh.json();
        if (refreshJson.success) {
          setProducts(refreshJson.data || []);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshJson.data || []));
        }
      } catch (error) {
        // Revert optimistic change
        setProducts((prev) =>
          newSaved ? prev.filter((p) => p.id !== productId) : [...prev, productObject || { id: productId }]
        );
        console.warn("Wishlist API error:", error);
      }
    }

    return newSaved;
  }

  return (
    <WishlistContext.Provider value={{ products, productIds, isSaved, toggle, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}