"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, PackageCheck } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import ActionedByBadge from "@/components/shared/ActionedByBadge";
import { useToast } from "@/contexts/ToastContext";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered"];

function nextValidStatuses(current) {
  const idx = ORDER_STATUSES.indexOf(current);
  if (idx === -1 || idx === ORDER_STATUSES.length - 1) return [];
  return ORDER_STATUSES.slice(idx + 1);
}

export default function AgentOrdersList({ initialOrders, currentActorName }) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();

  async function call(orderId, path, body) {
    setUpdatingId(orderId);
    const res = await fetch(`/api/v1/admin/orders/${orderId}/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setUpdatingId(null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Action failed");
      return null;
    }
    return json.data;
  }

  async function updateStatus(orderId, newStatus) {
    const result = await call(orderId, "status", { status: newStatus });
    if (!result) return;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    toast.success(`Order marked as ${newStatus}`);
  }

  async function verifyPayment(orderId) {
    const result = await call(orderId, "verify-payment");
    if (!result) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, paymentVerified: true, paymentVerifiedBy: currentActorName, paymentVerifiedAt: result.paymentVerifiedAt }
          : o
      )
    );
    toast.success("Payment verified");
  }

  async function confirmDelivered(orderId) {
    const result = await call(orderId, "mark-delivered");
    if (!result) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "delivered", deliveredConfirmedBy: currentActorName, deliveredConfirmedAt: result.deliveredConfirmedAt }
          : o
      )
    );
    toast.success("Order marked delivered");
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const options = nextValidStatuses(o.status);
        const isUpdating = updatingId === o.id;
        const canConfirmDelivery = o.status !== "delivered" && o.paymentVerified;

        return (
          <div key={o.id} className="bg-card border border-line rounded-md p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-medium font-mono text-sm">{o.orderNumber}</p>
                <p className="text-xs text-muted">{o.business?.name || o.businessName} · {o.buyer?.fullName || o.buyerName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-1 rounded-sm border border-fg capitalize">{o.status}</span>
                <span className="text-sm font-mono">{formatPrice(o.totalMinor, o.currency)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {o.paymentVerified ? (
                <ActionedByBadge verb="Payment verified" name={o.paymentVerifiedBy} at={o.paymentVerifiedAt} />
              ) : (
                <button onClick={() => verifyPayment(o.id)} disabled={isUpdating} className="flex items-center gap-1.5 text-xs border border-accent text-accent px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-white disabled:opacity-50 transition-colors">
                  <ShieldCheck size={12} /> Verify Payment
                </button>
              )}
              {o.deliveredConfirmedAt ? (
                <ActionedByBadge verb="Delivery confirmed" name={o.deliveredConfirmedBy} at={o.deliveredConfirmedAt} />
              ) : (
                canConfirmDelivery && (
                  <button onClick={() => confirmDelivered(o.id)} disabled={isUpdating} className="flex items-center gap-1.5 text-xs border border-accent text-accent px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-white disabled:opacity-50 transition-colors">
                    <PackageCheck size={12} /> Mark Delivered
                  </button>
                )
              )}
            </div>

            {options.length > 0 && o.status !== "delivered" && (
              <div className="flex items-center gap-2">
                <select
                  disabled={isUpdating}
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) updateStatus(o.id, e.target.value); }}
                  className="text-xs border border-line rounded-sm px-2 py-1.5 bg-bg focus:outline-none focus:border-accent disabled:opacity-50"
                >
                  <option value="" disabled>Update fulfillment status...</option>
                  {options.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
                {isUpdating && <Loader2 size={14} className="animate-spin text-muted" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
