"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, ArrowLeft, CheckCircle2, PackageCheck, Truck, XCircle, AlertTriangle,
  Phone, Mail, MapPin, CreditCard, Clock, MessageSquare, Send, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import {
  STATUS_META, PAYMENT_STATUS_META, STATUS_ACTIONS,
  PROVIDER_LABELS, DELIVERY_METHOD_LABELS, NOTE_REQUIRED_FOR, formatMoney,
} from "@/lib/orders";

const ACTION_ICONS = {
  confirmed: CheckCircle2,
  processing: Loader2,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
  disputed: AlertTriangle,
};

export default function SellerOrderDetailPage({ params }) {
  const { id } = params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // target status string or null
  const [actionNote, setActionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchOrder(); }, [id]);

  async function fetchOrder() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/orders/${id}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
      } else {
        toast.error(json.error?.message || "Could not load order");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  function openAction(targetStatus) {
    setActionModal(targetStatus);
    setActionNote("");
  }

  async function submitAction() {
    if (!actionModal) return;
    if (NOTE_REQUIRED_FOR.has(actionModal) && !actionNote.trim()) {
      toast.error("A reason is required for this action");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/v1/seller/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionModal, note: actionNote.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Order ${STATUS_ACTIONS[actionModal]?.label.toLowerCase() || "updated"}`);
        setActionModal(null);
        fetchOrder();
      } else {
        toast.error(json.error?.message || "Could not update order");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmittingAction(false);
    }
  }

  async function submitNote(e) {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/v1/seller/orders/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteInput.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNoteInput("");
        fetchOrder();
      } else {
        toast.error(json.error?.message || "Could not add note");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmittingNote(false);
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto mt-16" size={32} />;
  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">Order not found.</p>
        <Link href="/seller/orders" className="text-blue-600 text-sm underline mt-2 inline-block">Back to orders</Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[order.status] || { label: order.status, badge: "bg-gray-100 text-gray-600" };

  return (
    <div className="max-w-5xl">
      <Link href="/seller/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl">{order.orderNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.badge}`}>
              {statusMeta.label}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Placed {new Date(order.createdAt).toLocaleString()} · {DELIVERY_METHOD_LABELS[order.deliveryMethod] || order.deliveryMethod}
          </p>
        </div>

        {/* Actions */}
        {order.allowedTransitions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {order.allowedTransitions.map((target) => {
              const meta = STATUS_ACTIONS[target];
              const Icon = ACTION_ICONS[target] || CheckCircle2;
              if (!meta) return null;
              const isDanger = meta.tone === "danger";
              return (
                <button
                  key={target}
                  onClick={() => openAction(target)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ${
                    isDanger
                      ? "border border-red-300 text-red-700 hover:bg-red-50"
                      : "bg-yellow-400 hover:bg-yellow-500 text-blue-900"
                  }`}
                >
                  <Icon size={16} /> {meta.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {order.status === "disputed" && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-md p-4">
          <ShieldAlert size={18} className="text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">
            This order is under dispute and can only be resolved by an admin. Use the note field below to add context —
            it'll show up in the activity log for whoever picks this up.
          </p>
        </div>
      )}

      {order.status !== "disputed" &&
        order.allowedTransitions.length === 0 &&
        !["delivered"].includes(order.status) && (
          <div className="mb-6 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-4">
            This order is in a final state ({statusMeta.label.toLowerCase()}) — no further actions are available.
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: items, buyer, shipping */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Items ({order.items.length})</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-3 px-4 py-3">
                  <div className="w-14 h-14 rounded-md bg-gray-100 shrink-0 overflow-hidden">
                    {it.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{it.name}</p>
                    <p className="text-xs text-gray-500">
                      {[it.sku && `SKU ${it.sku}`, it.oemNumber && `OEM ${it.oemNumber}`, it.partNumber && `Part ${it.partNumber}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {it.variant && (
                      <p className="text-xs text-gray-400">
                        {Object.entries(it.variant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-900">{it.quantity} × {formatMoney(it.unitPriceMinor, order.currency)}</p>
                    <p className="text-sm font-medium text-gray-900">{formatMoney(it.subtotalMinor, order.currency)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-gray-200 space-y-1 bg-gray-50">
              <Row label="Subtotal" value={formatMoney(order.subtotalMinor, order.currency)} />
              <Row label="Shipping" value={formatMoney(order.shippingMinor, order.currency)} />
              <Row label="Tax" value={formatMoney(order.taxMinor, order.currency)} />
              <Row label="Total" value={formatMoney(order.totalMinor, order.currency)} bold />
            </div>
          </section>

          {/* Status timeline / notes */}
          <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {order.statusHistory.length === 0 && (
                <li className="px-4 py-6 text-sm text-gray-400 text-center">No activity yet.</li>
              )}
              {order.statusHistory.map((h) => (
                <li key={h.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_META[h.status]?.badge}`}>
                        {STATUS_META[h.status]?.label || h.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {h.isBuyer ? "Buyer" : h.actor} · {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {h.note && <p className="text-sm text-gray-700 mt-1.5">{h.note}</p>}
                </li>
              ))}
            </ul>
            <form onSubmit={submitNote} className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <MessageSquare size={16} className="text-gray-400 shrink-0" />
              <input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note or respond..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={submittingNote || !noteInput.trim()}
                className="inline-flex items-center gap-1.5 bg-blue-900 text-white text-sm font-medium px-3 py-2 rounded-md disabled:opacity-50"
              >
                <Send size={14} /> Send
              </button>
            </form>
          </section>
        </div>

        {/* Right column: payment, buyer, shipping */}
        <div className="space-y-6">
          {/* Payment */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard size={16} /> Payment
            </h2>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                order.payment.verified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}>
                {order.payment.verified ? "Verified" : "Awaiting verification"}
              </span>
            </div>
            {order.payment.verified && (
              <p className="text-xs text-gray-400 mb-3">
                Verified by {order.payment.verifiedBy || "—"}
                {order.payment.verifiedAt ? ` on ${new Date(order.payment.verifiedAt).toLocaleString()}` : ""}
              </p>
            )}
            {!order.payment.verified && (
              <p className="text-xs text-gray-400 mb-3">Payment verification is handled by the platform team.</p>
            )}
            {order.payment.records.length === 0 ? (
              <p className="text-sm text-gray-400">No payment records yet.</p>
            ) : (
              <ul className="space-y-2">
                {order.payment.records.map((p) => (
                  <li key={p.id} className="border border-gray-100 rounded-md p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{PROVIDER_LABELS[p.provider] || p.provider}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_STATUS_META[p.status]?.badge}`}>
                        {PAYMENT_STATUS_META[p.status]?.label || p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{formatMoney(p.amountMinor, p.currency)}</p>
                    {p.providerTransactionId && (
                      <p className="text-xs text-gray-400 mt-0.5">Ref: {p.providerTransactionId}</p>
                    )}
                    <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Buyer */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Buyer</h2>
            <p className="text-sm text-gray-900 font-medium">{order.buyer?.fullName}</p>
            {order.buyer?.phone && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1"><Phone size={13} /> {order.buyer.phone}</p>
            )}
            {order.buyer?.email && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1"><Mail size={13} /> {order.buyer.email}</p>
            )}
          </section>

          {/* Shipping */}
          <section className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={16} /> {order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}
            </h2>
            {order.shippingAddress ? (
              <div className="text-sm text-gray-600 space-y-0.5">
                {order.shippingAddress.recipientName && <p className="text-gray-900 font-medium">{order.shippingAddress.recipientName}</p>}
                <p>{order.shippingAddress.addressLine}</p>
                <p>
                  {[order.shippingAddress.town, order.shippingAddress.region, order.shippingAddress.country].filter(Boolean).join(", ")}
                </p>
                {order.shippingAddress.phone && <p className="flex items-center gap-1.5 mt-1"><Phone size={13} /> {order.shippingAddress.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No shipping address on file — likely a pickup order.</p>
            )}
            {order.delivery.confirmedAt && (
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1.5">
                <Clock size={12} /> Delivered confirmed by {order.delivery.confirmedBy || "—"} on{" "}
                {new Date(order.delivery.confirmedAt).toLocaleString()}
              </p>
            )}
          </section>

          {order.buyerNotes && (
            <section className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Buyer's note</h2>
              <p className="text-sm text-gray-600">{order.buyerNotes}</p>
            </section>
          )}
        </div>
      </div>

      {/* Action confirmation modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submittingAction && setActionModal(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">{STATUS_ACTIONS[actionModal]?.label}</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will move order {order.orderNumber} to <strong>{STATUS_META[actionModal]?.label}</strong>.
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              {NOTE_REQUIRED_FOR.has(actionModal) ? "Reason (required)" : "Note (optional)"}
            </label>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm mb-4"
              placeholder={
                actionModal === "cancelled"
                  ? "Why is this order being cancelled?"
                  : actionModal === "disputed"
                  ? "What's the issue with this order?"
                  : "Add any context for this update..."
              }
            />
            <div className="flex gap-2">
              <button
                onClick={() => setActionModal(null)}
                disabled={submittingAction}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={submittingAction}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-md disabled:opacity-60 ${
                  STATUS_ACTIONS[actionModal]?.tone === "danger"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-yellow-400 text-blue-900 hover:bg-yellow-500"
                }`}
              >
                {submittingAction ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? "font-semibold text-gray-900" : "text-gray-500"}>{label}</span>
      <span className={bold ? "font-semibold text-gray-900" : "text-gray-700"}>{value}</span>
    </div>
  );
}
