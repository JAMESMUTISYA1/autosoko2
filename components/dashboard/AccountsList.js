"use client";

import { useState } from "react";
import { Store as StoreIcon, UserCog, Loader2, ShieldOff, ShieldCheck } from "lucide-react";
import ActionedByBadge from "@/components/shared/ActionedByBadge";
import { useToast } from "@/contexts/ToastContext";

export default function AccountsList({ initialAccounts, currentActorName }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [pendingId, setPendingId] = useState(null);
  const [reasonDraft, setReasonDraft] = useState({});
  const toast = useToast();

  async function toggleSuspend(id) {
    const account = accounts.find((a) => a.id === id);
    const suspending = !account.suspended;
    const reason = reasonDraft[id];

    if (suspending && !reason?.trim()) {
      toast.error("Enter a reason before suspending");
      return;
    }

    setPendingId(id);
    const res = await fetch(`/api/v1/admin/accounts/${id}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: account.type, suspended: suspending, reason }),
    }).catch(() => null);
    setPendingId(null);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Action failed");
      return;
    }

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, suspended: suspending, suspendedReason: suspending ? reason : null, suspendedBy: suspending ? currentActorName : null, suspendedAt: suspending ? new Date().toISOString() : null }
          : a
      )
    );
    toast.success(`${account.name} ${suspending ? "suspended" : "reactivated"}`);
  }

  return (
    <div className="bg-card border border-line rounded-md divide-y divide-line">
      {accounts.map((a) => {
        const isPending = pendingId === a.id;
        const Icon = a.type === "agent" ? UserCog : StoreIcon;
        return (
          <div key={a.id} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={18} className="text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted">{a.subtitle} · {a.location}</p>
                  {a.suspended && (
                    <div className="mt-1 space-y-0.5">
                      {a.suspendedReason && <p className="text-xs text-muted">Reason: {a.suspendedReason}</p>}
                      <ActionedByBadge verb="Suspended" name={a.suspendedBy} at={a.suspendedAt ? new Date(a.suspendedAt).toLocaleString() : null} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] px-2 py-1 rounded-sm border ${a.suspended ? "border-line text-muted" : "border-fg"}`}>
                  {a.suspended ? "Suspended" : "Active"}
                </span>
                <button
                  onClick={() => toggleSuspend(a.id)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm disabled:opacity-50 transition-colors ${a.suspended ? "bg-accent text-white hover:bg-accent/90" : "border border-line hover:border-fg"}`}
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : a.suspended ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                  {a.suspended ? "Reactivate" : "Suspend"}
                </button>
              </div>
            </div>
            {!a.suspended && (
              <input
                type="text"
                placeholder="Reason (required to suspend)"
                value={reasonDraft[a.id] || ""}
                onChange={(e) => setReasonDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                className="w-full mt-2.5 border border-line rounded-sm px-2.5 py-1.5 text-xs bg-bg focus:outline-none focus:border-accent"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
