"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "autosoko-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount — guest cart persistence via localStorage is a
  // normal e-commerce pattern (unlike Claude's in-chat artifacts, this
  // is a real deployed app, so localStorage is the right tool here).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't overwrite storage with [] before load completes
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full/unavailable — cart still works for this session.
    }
  }, [items, hydrated]);

  function addItem(product, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images?.[0] || product.image,
          priceMinor: product.priceMinor,
          currency: product.currency,
          quantity,
          storeId: product.storeId,
          storeName: product.sellerName,
        },
      ];
    });
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQuantity(productId, quantity) {
    if (quantity < 1) return removeItem(productId);
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }

  function clear() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Grouped by seller — mirrors Document 3 §6.1: a multi-seller cart
  // becomes multiple orders at checkout, one per business.
  const groupedByStore = items.reduce((groups, item) => {
    if (!groups[item.storeId]) {
      groups[item.storeId] = { storeId: item.storeId, storeName: item.storeName, items: [] };
    }
    groups[item.storeId].items.push(item);
    return groups;
  }, {});

  const grandTotalMinor = items.reduce((sum, i) => sum + i.priceMinor * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        groupedByStore: Object.values(groupedByStore),
        grandTotalMinor,
        addItem,
        removeItem,
        updateQuantity,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
