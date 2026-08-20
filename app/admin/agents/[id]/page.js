"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { MapPin, Mail, Phone, ShieldCheck, Package, Loader2 } from "lucide-react";
import { agents, cityName } from "@/data/adminData";
import { useToast } from "@/contexts/ToastContext";

export default function AgentDetailPage({ params }) {
  const agent = agents.find((a) => a.id === params.id);
  const toast = useToast();
  const [status, setStatus] = useState(agent?.status);
  const [updating, setUpdating] = useState(false);

  if (!agent) return notFound();

  async function toggleStatus() {
    setUpdating(true);
    // Replace with PATCH /api/v1/admin/agents/:id (extends Document 3 §11)
    await new Promise((r) => setTimeout(r, 500));
    const next = status === "active" ? "suspended" : "active";
    setStatus(next);
    setUpdating(false);
    toast.success(`${agent.name} is now ${next}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-xl shrink-0">
            {agent.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-xl">{agent.name}</h1>
            <span className="flex items-center gap-1.5 text-sm text-muted mt-0.5">
              <MapPin size={13} />
              {cityName(agent.cityId)}
            </span>
          </div>
        </div>
        <span
          className={`text-[11px] px-2.5 py-1.5 rounded-sm border ${
            status === "active" ? "border-fg" : "border-line text-muted"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="bg-card border border-line rounded-md p-5 space-y-3 mb-6">
        <div className="flex items-center gap-2.5 text-sm">
          <Mail size={14} className="text-muted" />
          {agent.email}
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <Phone size={14} className="text-muted" />
          {agent.phone}
        </div>
        <div className="text-xs text-muted pt-2 border-t border-line">
          Agent since {agent.createdAt}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-line rounded-md p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-2">
            <ShieldCheck size={14} />
            Verifications
          </div>
          <p className="font-display text-2xl">{agent.stats.verificationsCompleted}</p>
        </div>
        <div className="bg-card border border-line rounded-md p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-2">
            <Package size={14} />
            Orders Handled
          </div>
          <p className="font-display text-2xl">{agent.stats.ordersHandled}</p>
        </div>
      </div>

      <button
        onClick={toggleStatus}
        disabled={updating}
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-sm border transition-colors disabled:opacity-60 ${
          status === "active"
            ? "border-fg hover:bg-fg hover:text-bg"
            : "border-fg bg-accent text-white hover:bg-accent/90"
        }`}
      >
        {updating && <Loader2 size={14} className="animate-spin" />}
        {status === "active" ? "Suspend Agent" : "Reactivate Agent"}
      </button>
    </div>
  );
}
