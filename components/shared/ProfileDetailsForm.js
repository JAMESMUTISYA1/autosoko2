"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function ProfileDetailsForm({ initialName, initialEmail, initialPhone }) {
  const toast = useToast();
  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    // Replace with PATCH /api/v1/users/me
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    toast.success("Profile updated");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-line rounded-md p-5">
      <div className="flex items-center gap-3 pb-2">
        <div className="w-14 h-14 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-xl shrink-0">
          {name?.charAt(0) || "?"}
        </div>
        <div>
          <h2 className="font-display text-base">{name}</h2>
          <p className="text-xs text-muted">{email}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Full Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        {submitting ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
