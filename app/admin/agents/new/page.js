"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function NewAgentPage() {
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/v1/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone }),
    }).catch(() => null);
    setSubmitting(false);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      setErrors(json?.error?.fields || {});
      toast.error(json?.error?.message || "Couldn't create agent account");
      return;
    }

    toast.success(`Agent account created for ${fullName}`);
    router.push("/admin/agents");
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl mb-1">Create Agent</h1>
      <p className="text-sm text-muted mb-8">Agents verify businesses and track deliveries.</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-line rounded-md p-6">
        <div>
          <label className="block text-xs text-muted mb-1.5">Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent" />
          {errors.fullName && <p className="text-xs mt-1 font-semibold">{errors.fullName}</p>}
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Work Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent" />
          {errors.email && <p className="text-xs mt-1 font-semibold">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254712345678" className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent" />
          {errors.phone && <p className="text-xs mt-1 font-semibold">{errors.phone}</p>}
        </div>
        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-sm py-3 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
          {submitting && <Loader2 size={16} className="animate-spin" />} {submitting ? "Creating..." : "Create Agent Account"}
        </button>
        <div className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={13} /> A temporary password will be sent to the agent's phone.
        </div>
      </form>
    </div>
  );
}
