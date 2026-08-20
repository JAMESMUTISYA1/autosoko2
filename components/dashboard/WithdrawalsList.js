"use client";

import { useState } from "react";
import { Check, X, Loader2, Banknote } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import ActionedByBadge from "@/components/shared/ActionedByBadge";
import { useToast } from "@/contexts/ToastContext";

export default function WithdrawalsList({ initialRequests, currentActorName }) {
  const [requests, setRequests] = useState(initialRequests);
  const [pendingId, setPendingId] = useState(null);
  const toast = useToast();

  async function updateStatus(id, status) {
    setPendingId(id);
    const res = await fetch(`/api/v1/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setPendingId(null);

    const json = await res?.json().catch(() => null);
    const req = requests.find((r) => r.id === id);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Action failed");
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, processedBy: currentActorName } : r)));
    toast.success(`Withdrawal for ${req.sellerName} marked ${status}`);
  }

  if (requests.length === 0) {
    return (
      <div className="bg-card border border-line rounded-md px-5 py-12 text-center">
        <p className="text-sm text-muted">No withdrawal requests.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-line rounded-md divide-y divide-line">
      {requests.map((r) => {
        const isPending = pendingId === r.id;
        return (
          <div key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Banknote size={18} className="text-muted shrink-0" />
              <div>
                <p className="text-sm font-medium">{r.sellerName}</p>
                <p className="text-xs text-muted">{r.method} · {r.destination} · Requested {new Date(r.createdAt).toLocaleDateString()}</p>
                {r.processedBy && <div className="mt-1"><ActionedByBadge verb="Processed" name={r.processedBy} at={r.processedAt ? new Date(r.processedAt).toLocaleString() : null} /></div>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-sm">{formatPrice(r.amountMinor, r.currency)}</span>
              <span className={`text-[11px] px-2 py-1 rounded-sm border capitalize ${r.status === "pending" ? "border-accent text-accent" : "border-line text-muted"}`}>{r.status}</span>
              {r.status === "pending" && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateStatus(r.id, "rejected")} disabled={isPending} className="flex items-center gap-1 text-xs border border-line px-2.5 py-1.5 rounded-sm hover:border-fg disabled:opacity-50 transition-colors">
                    <X size={12} /> Reject
                  </button>
                  <button onClick={() => updateStatus(r.id, "approved")} disabled={isPending} className="flex items-center gap-1 text-xs bg-accent text-white px-2.5 py-1.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                  </button>
                </div>
              )}
              {r.status === "approved" && (
                <button onClick={() => updateStatus(r.id, "paid")} disabled={isPending} className="flex items-center gap-1 text-xs bg-accent text-white px-2.5 py-1.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Mark Paid
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
