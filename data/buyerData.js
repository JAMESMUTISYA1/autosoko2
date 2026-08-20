// Placeholder past orders for the buyer account view. Shaped like
// Document 3 §6.2's order response — a real implementation replaces
// this with GET /api/v1/orders (buyer-scoped).

export const ORDER_STATUS_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"];

export const buyerOrders = [
  {
    id: "ord-7001",
    orderNumber: "AS-7001",
    storeName: "Nairobi Auto Spares",
    items: [
      {
        name: "Front Brake Pads — Toyota Corolla (2016–2019)",
        image: "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?q=80&w=400&auto=format&fit=crop",
        priceMinor: 350000,
        quantity: 1,
      },
    ],
    status: "delivered",
    totalMinor: 350000,
    currency: "KES",
    placedAt: "2026-07-28",
    deliveryMethod: "courier",
    history: [
      { status: "pending", at: "2026-07-28 09:12" },
      { status: "confirmed", at: "2026-07-28 10:03" },
      { status: "processing", at: "2026-07-28 14:20" },
      { status: "shipped", at: "2026-07-29 08:45" },
      { status: "delivered", at: "2026-07-30 16:10" },
    ],
  },
  {
    id: "ord-7002",
    orderNumber: "AS-7002",
    storeName: "Mombasa Parts Junction",
    items: [
      {
        name: "Radiator — Nissan X-Trail (T31)",
        image: "https://images.unsplash.com/photo-1527383418406-f85a3b146499?q=80&w=400&auto=format&fit=crop",
        priceMinor: 720000,
        quantity: 1,
      },
    ],
    status: "shipped",
    totalMinor: 720000,
    currency: "KES",
    placedAt: "2026-08-05",
    deliveryMethod: "courier",
    history: [
      { status: "pending", at: "2026-08-05 11:30" },
      { status: "confirmed", at: "2026-08-05 12:15" },
      { status: "processing", at: "2026-08-06 09:00" },
      { status: "shipped", at: "2026-08-07 07:40" },
    ],
  },
  {
    id: "ord-7003",
    orderNumber: "AS-7003",
    storeName: "Kampala Auto Traders",
    items: [
      {
        name: "17-Inch Alloy Rims — Set of 4",
        image: "https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?q=80&w=400&auto=format&fit=crop",
        priceMinor: 3200000,
        quantity: 1,
      },
      {
        name: "Tyre 205/55 R17 — All Season (Single)",
        image: "https://images.unsplash.com/photo-1595787142842-7404bc60470d?q=80&w=400&auto=format&fit=crop",
        priceMinor: 980000,
        quantity: 4,
      },
    ],
    status: "pending",
    totalMinor: 7120000,
    currency: "KES",
    placedAt: "2026-08-09",
    deliveryMethod: "pickup",
    history: [{ status: "pending", at: "2026-08-09 08:05" }],
  },
];

export function getBuyerOrder(id) {
  return buyerOrders.find((o) => o.id === id) || null;
}
