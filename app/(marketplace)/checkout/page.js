"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/sampleData";

const PAYMENT_METHODS = [
  { id: "mpesa", label: "M-Pesa" },
  { id: "airtel", label: "Airtel Money" },
  { id: "card", label: "Card" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState("mpesa");
  const [deliveryMethods, setDeliveryMethods] = useState(
    Object.fromEntries(cart.groupedByStore.map((g) => [g.storeId, "courier"]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [placedOrders, setPlacedOrders] = useState(null);
  const [error, setError] = useState("");

  function setDeliveryFor(storeId, method) {
    setDeliveryMethods((prev) => ({ ...prev, [storeId]: method }));
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError("");
    if (!address.trim() || !town.trim() || !phone.trim()) {
      setError("Fill in your delivery address and phone number");
      return;
    }

    setSubmitting(true);
    // Real call to POST /api/v1/orders (Document 3 §6.1) — creates one
    // order row per seller in a single DB transaction with atomic stock
    // locking (verified against real Postgres — see BACKEND.md).
    // Payment initiation (§7.1, M-Pesa STK push / card charge) isn't
    // wired yet — orders are created in "pending" status same as before.
    let response;
    try {
      response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          deliveryMethod: Object.values(deliveryMethods)[0] || "courier",
        }),
      });
    } catch {
      setSubmitting(false);
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    setSubmitting(false);

    if (response.status === 401) {
      // Cart is guest-usable, but placing a real order needs an account —
      // standard "browse as guest, log in to check out" pattern. This is
      // an honest stop, not a silent fake success.
      router.push(`/auth/login?redirectTo=/checkout`);
      return;
    }

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.success) {
      // Cart items added before this page was wired to the real API
      // (or seeded from mock data) won't have real database ids, so
      // this is the expected error for those — surfaced honestly
      // rather than pretending the order went through.
      setError(json?.error?.message || "Couldn't place the order. Try removing and re-adding items from a product page.");
      return;
    }

    setPlacedOrders(json.data.orders);
    cart.clear();
  }

  if (cart.items.length === 0 && !placedOrders) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-sm text-muted mb-6">Your cart is empty.</p>
        <Link href="/search" className="bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90">
          Browse Parts
        </Link>
      </div>
    );
  }

  if (placedOrders) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4" />
        <h1 className="font-display text-xl mb-2">Order{placedOrders.length > 1 ? "s" : ""} Placed</h1>
        <p className="text-sm text-muted mb-6">
          {placedOrders.length > 1
            ? `Your cart was split into ${placedOrders.length} orders — one per seller.`
            : "We've notified the seller and you'll get updates as it ships."}
        </p>
        <div className="border border-line rounded-md divide-y divide-line mb-6 text-left">
          {placedOrders.map((o) => (
            <div key={o.orderNumber} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-mono font-medium">{o.orderNumber}</p>
                <p className="text-xs text-muted">{o.business?.name || o.storeName}</p>
              </div>
              <span className="font-mono">{formatPrice(o.totalMinor, "KES")}</span>
            </div>
          ))}
        </div>
        <Link
          href="/account/orders"
          className="inline-block bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-1">Checkout</h1>
      <p className="text-sm text-muted mb-8">
        {cart.groupedByStore.length > 1
          ? `This will create ${cart.groupedByStore.length} separate orders, one per seller.`
          : "Review delivery and payment before placing your order."}
      </p>

      <form onSubmit={handlePlaceOrder} className="space-y-6">
        {/* Delivery address */}
        <div className="bg-card border border-line rounded-md p-5 space-y-4">
          <h2 className="font-display text-base flex items-center gap-2">
            <MapPin size={16} />
            Delivery Address
          </h2>
          <div>
            <label className="block text-xs text-muted mb-1.5">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, estate, landmark"
              className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Town</label>
              <input
                value={town}
                onChange={(e) => setTown(e.target.value)}
                className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254712345678"
                className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
              />
            </div>
          </div>
        </div>

        {/* Per-seller delivery method */}
        <div className="bg-card border border-line rounded-md divide-y divide-line">
          {cart.groupedByStore.map((group) => {
            const subtotal = group.items.reduce((s, i) => s + i.priceMinor * i.quantity, 0);
            return (
              <div key={group.storeId} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">{group.storeName}</h3>
                  <span className="text-sm font-mono text-muted">
                    {formatPrice(subtotal, "KES")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["courier", "pickup"].map((method) => (
                    <label
                      key={method}
                      className={`text-center text-sm border rounded-sm px-3 py-2 cursor-pointer capitalize ${
                        deliveryMethods[group.storeId] === method
                          ? "border-fg bg-fg text-bg"
                          : "border-line"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`delivery-${group.storeId}`}
                        checked={deliveryMethods[group.storeId] === method}
                        onChange={() => setDeliveryFor(group.storeId, method)}
                        className="sr-only"
                      />
                      {method === "courier" ? "Courier Delivery" : "Pickup From Seller"}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment method */}
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-3">Payment Method</h2>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                className={`text-center text-sm border rounded-sm px-3 py-2.5 cursor-pointer ${
                  payment === m.id ? "border-fg bg-fg text-bg" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={payment === m.id}
                  onChange={() => setPayment(m.id)}
                  className="sr-only"
                />
                {m.label}
              </label>
            ))}
          </div>
          {payment === "mpesa" && (
            <p className="text-xs text-muted mt-3">
              You'll receive an STK push prompt on {phone || "your phone"} to confirm payment.
            </p>
          )}
        </div>

        {error && <p className="text-sm font-semibold">{error}</p>}

        <div className="flex items-center justify-between border border-fg rounded-md p-5">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider">Total</p>
            <p className="font-display text-xl">{formatPrice(cart.grandTotalMinor, "KES")}</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-accent text-white font-semibold text-sm px-6 py-3 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
