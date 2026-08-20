"use client";

import { useState } from "react";
import { FileText, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function VerificationsList({ initialVerifications, currentActorName }) {
  const [items, setItems] = useState(initialVerifications);
  const [pendingId, setPendingId] = useState(null);
  const toast = useToast();

  async function decide(id, decision) {
    setPendingId(id);
    const res = await fetch(`/api/v1/admin/verifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    }).catch(() => null);
    setPendingId(null);

    const json = await res?.json().catch(() => null);
    const item = items.find((v) => v.id === id);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Couldn't process that decision");
      return;
    }

    setItems((prev) => prev.filter((v) => v.id !== id));
    toast[decision === "approved" ? "success" : "info"](
      `${item.name} ${decision} by ${currentActorName}`
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card border border-line rounded-md px-5 py-12 text-center">
        <p className="text-sm text-muted">You're all caught up — no pending verifications.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-line rounded-md divide-y divide-line">
      {items.map((v) => {
        const isPending = pendingId === v.id;
        return (
          <div key={v.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{v.name}</p>
              <p className="text-xs text-muted mt-0.5">{v.type} · Submitted {new Date(v.submittedAt || v.createdAt).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(v.documents || []).map((doc) => (
                  <span key={doc} className="flex items-center gap-1 text-[11px] border border-line rounded-sm px-2 py-1 text-muted">
                    <FileText size={11} />
                    {doc}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => decide(v.id, "rejected")}
                disabled={isPending}
                className="flex items-center gap-1.5 border border-line text-muted text-sm px-3.5 py-2 rounded-sm hover:border-fg hover:text-fg disabled:opacity-50 transition-colors"
              >
                <X size={14} /> Reject
              </button>
              <button
                onClick={() => decide(v.id, "approved")}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-3.5 py-2 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Approve
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
