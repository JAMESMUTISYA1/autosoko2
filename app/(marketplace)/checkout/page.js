"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  MapPin,
  Search,
  CreditCard,
  Smartphone,
  Send,
  Clock,
  Truck,
  PlusCircle,
  Home,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/data/sampleData";

const PAYMENT_METHODS = [
  { id: "mpesa", label: "M-Pesa" },
  { id: "airtel", label: "Airtel Money" },
  { id: "card", label: "Card" },
];

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();

  // Delivery state
  const [deliveryMethods, setDeliveryMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [useCustomDelivery, setUseCustomDelivery] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [customExplanation, setCustomExplanation] = useState("");
  const [townSearch, setTownSearch] = useState("");

  // Payment state
  const [payment, setPayment] = useState("mpesa");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [promptSent, setPromptSent] = useState(false);
  const [promptSending, setPromptSending] = useState(false);
  const [promptCooldown, setPromptCooldown] = useState(0);

  // Order state
  const [submitting, setSubmitting] = useState(false);
  const [placedOrders, setPlacedOrders] = useState(null);
  const [error, setError] = useState("");

  // Fetch delivery methods
  useEffect(() => {
    async function fetchDeliveryMethods() {
      try {
        const res = await fetch(`${getBaseUrl()}/api/v1/delivery-methods`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDeliveryMethods(json.data.filter((m) => m.active));
        }
      } catch (err) {
        console.warn("Could not fetch delivery methods:", err);
      }
    }
    fetchDeliveryMethods();
  }, []);

  // Prompt cooldown timer
  useEffect(() => {
    if (promptCooldown <= 0) return;
    const t = setTimeout(() => setPromptCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [promptCooldown]);

  function resetPromptState() {
    setPromptSent(false);
    setPromptCooldown(0);
  }

  async function handleSendPrompt() {
    if (!paymentPhone.trim()) {
      setError("Enter your phone number for payment.");
      return;
    }
    setPromptSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setPromptSending(false);
    setPromptSent(true);
    setPromptCooldown(30);
    setError("");
  }

  function handlePaymentMethodChange(methodId) {
    setPayment(methodId);
    resetPromptState();
    setError("");
  }

  function handleSelectDeliveryMethod(methodId) {
    setSelectedMethodId(methodId);
    setUseCustomDelivery(false);
    setError("");
  }

  function handleSelectCustomDelivery() {
    setUseCustomDelivery(true);
    setSelectedMethodId("");
    setError("");
  }

  const filteredMethods = deliveryMethods.filter((m) => {
    if (!townSearch.trim()) return true;
    return m.town?.name?.toLowerCase().includes(townSearch.toLowerCase()) ?? false;
  });

  const selectedMethod = deliveryMethods.find((m) => m.id === selectedMethodId);
  const deliveryFee = selectedMethod ? selectedMethod.feeMinor : 0;
  const grandTotal = cart.grandTotalMinor + deliveryFee;

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError("");

    if (useCustomDelivery) {
      if (!customAddress.trim() || !customExplanation.trim()) {
        setError("Provide an address and explanation for custom delivery.");
        return;
      }
    } else if (!selectedMethodId) {
      setError("Select a delivery method.");
      return;
    }

    if (payment === "mpesa" || payment === "airtel") {
      if (!paymentPhone.trim()) {
        setError("Enter the phone number to receive the payment prompt.");
        return;
      }
      if (!promptSent) {
        setError("Send the payment prompt first.");
        return;
      }
    } else if (payment === "card") {
      if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        setError("Fill in all card details.");
        return;
      }
    }

    setSubmitting(true);
    let response;
    try {
      response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          deliveryMethodId: useCustomDelivery ? null : selectedMethodId,
          customDelivery: useCustomDelivery
            ? { address: customAddress, explanation: customExplanation }
            : undefined,
          paymentMethod: payment,
          paymentPhone: payment === "mpesa" || payment === "airtel" ? paymentPhone : undefined,
          cardDetails: payment === "card" ? { cardNumber, cardExpiry, cardCvv } : undefined,
        }),
      });
    } catch {
      setSubmitting(false);
      setError("Couldn't reach the server. Check your connection and try again.");
      return;
    }

    setSubmitting(false);

    if (response.status === 401) {
      router.push(`/auth/login?redirectTo=/checkout`);
      return;
    }

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      setError(json?.error?.message || "Couldn't place the order. Please try again.");
      return;
    }

    setPlacedOrders(json.data.orders);
    cart.clear();
  }

  // Early returns
  if (cart.items.length === 0 && !placedOrders) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShoppingCartIcon />
          <p className="text-sm text-gray-500 mb-6">Your cart is empty.</p>
          <Link
            href="/search"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold px-6 py-3 rounded-md transition-colors"
          >
            Browse Parts
          </Link>
        </div>
      </div>
    );
  }

  if (placedOrders) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <CheckCircle2 size={40} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-display text-gray-900 mb-2">
            Order{placedOrders.length > 1 ? "s" : ""} Placed
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {placedOrders.length > 1
              ? `Your cart was split into ${placedOrders.length} orders — one per seller.`
              : "We've notified the seller and you'll get updates as it ships."}
          </p>
          <div className="border border-gray-200 rounded-md divide-y divide-gray-100 mb-6 text-left">
            {placedOrders.map((o) => (
              <div key={o.orderNumber} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-mono font-medium text-gray-900">{o.orderNumber}</p>
                  <p className="text-xs text-gray-500">{o.business?.name || o.storeName}</p>
                </div>
                <span className="font-mono text-gray-900">{formatPrice(o.totalMinor, "KES")}</span>
              </div>
            ))}
          </div>
          <Link
            href="/account/orders"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold px-6 py-3 rounded-md transition-colors"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl md:text-3xl font-display text-gray-900 mb-1">Checkout</h1>
        <p className="text-sm text-gray-500 mb-8">
          {cart.groupedByStore.length > 1
            ? `This will create ${cart.groupedByStore.length} separate orders, one per seller.`
            : "Review delivery and payment before placing your order."}
        </p>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Order Items */}
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Order Items</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {cart.groupedByStore.map((group) => (
                  <div key={group.storeId}>
                    <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                      {group.storeName}
                    </div>
                    {group.items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-4 px-4 py-3">
                        <div className="relative w-14 h-14 rounded-md overflow-hidden border border-gray-200 shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatPrice(item.priceMinor, item.currency)} × {item.quantity}
                          </p>
                        </div>
                        <div className="font-mono text-sm text-gray-900">
                          {formatPrice(item.priceMinor * item.quantity, item.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Delivery & Payment */}
          <div className="space-y-6">
            {/* Delivery Method */}
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Truck size={16} className="text-blue-600" />
                  Delivery Method
                </h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Town Search */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Search by Town
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={townSearch}
                      onChange={(e) => setTownSearch(e.target.value)}
                      placeholder="e.g. Nairobi"
                      className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                {/* Delivery Method List */}
                {!useCustomDelivery && (
                  <div className="space-y-2">
                    {filteredMethods.length > 0 ? (
                      filteredMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-center justify-between border rounded-md p-3 cursor-pointer transition-colors ${
                            selectedMethodId === method.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="deliveryMethod"
                              checked={selectedMethodId === method.id}
                              onChange={() => handleSelectDeliveryMethod(method.id)}
                              className="sr-only"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {method.method} · {method.provider}
                              </p>
                              <p className="text-xs text-gray-500">
                                ETA: {method.etaDays} day{method.etaDays > 1 ? "s" : ""}
                                {method.town?.name ? ` · ${method.town.name}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-sm text-gray-900">
                            {formatPrice(method.feeMinor, "KES")}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No delivery methods available for your search. You can use custom delivery below.
                      </p>
                    )}
                  </div>
                )}

                {/* Custom Delivery Button (separate and obvious) */}
                <button
                  type="button"
                  onClick={handleSelectCustomDelivery}
                  className={`w-full flex items-center justify-center gap-2 border rounded-md p-3 transition-colors ${
                    useCustomDelivery
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  {useCustomDelivery ? (
                    <>
                      <Home size={18} />
                      <span className="font-medium">Custom Delivery Selected</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} />
                      <span className="font-medium">Use Custom Delivery</span>
                    </>
                  )}
                </button>

                {/* Custom delivery fields */}
                {useCustomDelivery && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Address
                      </label>
                      <input
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="Where should we deliver?"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Explanation / Special Instructions
                      </label>
                      <textarea
                        value={customExplanation}
                        onChange={(e) => setCustomExplanation(e.target.value)}
                        rows={3}
                        placeholder="e.g. Deliver to gate B, call on arrival, etc."
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-600" />
                  Payment Method
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.id}
                      className={`flex flex-col items-center justify-center text-center border rounded-md p-3 cursor-pointer transition-colors ${
                        payment === m.id
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === m.id}
                        onChange={() => handlePaymentMethodChange(m.id)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{m.label}</span>
                    </label>
                  ))}
                </div>

                {(payment === "mpesa" || payment === "airtel") && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Phone Number for Payment
                      </label>
                      <input
                        type="tel"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        placeholder="+254712345678"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendPrompt}
                        disabled={promptSending || (promptSent && promptCooldown > 0)}
                        className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60 transition-colors"
                      >
                        {promptSending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : promptSent ? (
                          promptCooldown > 0 ? (
                            <Clock size={14} />
                          ) : (
                            <Send size={14} />
                          )
                        ) : (
                          <Send size={14} />
                        )}
                        {promptSending
                          ? "Sending..."
                          : promptSent
                          ? promptCooldown > 0
                            ? `Resend in ${promptCooldown}s`
                            : "Send Prompt Again"
                          : "Send Prompt"}
                      </button>
                      {promptSent && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          Waiting for payment...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {payment === "card" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Card Number
                      </label>
                      <input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                        placeholder="1234 5678 9012 3456"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Expiry
                      </label>
                      <input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        CVV
                      </label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="•••"
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Order Summary */}
            <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-mono text-gray-900">
                    {formatPrice(cart.grandTotalMinor, "KES")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-mono text-gray-900">
                    {useCustomDelivery ? "—" : formatPrice(deliveryFee, "KES")}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="font-mono text-gray-900">{formatPrice(grandTotal, "KES")}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-6 py-3 rounded-md disabled:opacity-60 transition-colors"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Placing Order..." : "Place Order"}
              </button>
              {error && (
                <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md p-3 mt-4">
                  {error}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Fallback shopping cart icon
function ShoppingCartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mx-auto mb-4 text-gray-300"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}