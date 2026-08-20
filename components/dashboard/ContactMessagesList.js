"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import ActionedByBadge from "@/components/shared/ActionedByBadge";
import { useToast } from "@/contexts/ToastContext";

export default function ContactMessagesList({ initialMessages, currentActorName }) {
  const [messages, setMessages] = useState(initialMessages);
  const [resolvingId, setResolvingId] = useState(null);
  const toast = useToast();

  async function resolve(id) {
    setResolvingId(id);
    const res = await fetch(`/api/v1/support/${id}/resolve`, { method: "PATCH" }).catch(() => null);
    setResolvingId(null);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Action failed");
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "resolved", resolvedBy: currentActorName, resolvedAt: new Date().toISOString() } : m))
    );
    toast.success("Marked as resolved");
  }

  if (messages.length === 0) {
    return (
      <div className="bg-card border border-line rounded-md px-5 py-12 text-center">
        <p className="text-sm text-muted">No messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className="bg-card border border-line rounded-md p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-sm font-medium">{m.subject}</p>
              <p className="text-xs text-muted mt-0.5">{m.name} · {m.email} · {new Date(m.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`text-[11px] px-2 py-1 rounded-sm border shrink-0 ${m.status === "open" ? "border-accent text-accent" : "border-line text-muted"}`}>{m.status}</span>
          </div>
          <p className="text-sm text-muted mb-3">{m.message}</p>
          {m.status === "resolved" ? (
            <ActionedByBadge verb="Resolved" name={m.resolvedBy} at={m.resolvedAt ? new Date(m.resolvedAt).toLocaleString() : null} />
          ) : (
            <button onClick={() => resolve(m.id)} disabled={resolvingId === m.id} className="flex items-center gap-1.5 text-xs border border-accent text-accent px-2.5 py-1.5 rounded-sm hover:bg-accent hover:text-white disabled:opacity-50 transition-colors">
              {resolvingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Mark Resolved
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
