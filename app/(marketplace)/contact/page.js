"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const CONTACT_DETAILS = [
  { icon: Mail, label: "Email", value: "support@autosoko.africa" },
  { icon: Phone, label: "Phone", value: "+254 700 000 000" },
  { icon: MapPin, label: "Head Office", value: "Nairobi, Kenya" },
];

export default function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in name, email, and message.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/v1/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject: subject || "General inquiry", message }),
    }).catch(() => null);
    setSubmitting(false);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Couldn't send your message. Try again.");
      return;
    }
    setSent(true);
    toast.success("Message sent");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl text-gray-900 mb-2">Contact Us</h1>
      <p className="text-sm text-gray-500 mb-10 max-w-lg">
        Questions about an order, a listing, or your account? Reach out —
        we typically reply within a business day.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
        <div>
          {sent ? (
            <div className="border border-gray-300 rounded-md p-8 text-center bg-white">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-green-500" />
              <h2 className="font-display text-lg text-gray-900 mb-1">Message Sent</h2>
              <p className="text-sm text-gray-500">
                Thanks, {name.split(" ")[0]} — we'll get back to you at {email}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a topic</option>
                  <option>Order issue</option>
                  <option>Seller account</option>
                  <option>Report a listing</option>
                  <option>Partnership / press</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-300 rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm px-6 py-3 rounded-sm disabled:opacity-60 transition-colors"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          {CONTACT_DETAILS.map((d) => (
            <div key={d.label} className="flex items-start gap-3 border border-gray-300 rounded-md p-4 bg-white">
              <d.icon size={17} className="text-gray-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{d.label}</p>
                <p className="text-sm text-gray-900">{d.value}</p>
              </div>
            </div>
          ))}
          <div className="border border-gray-300 rounded-md p-4 bg-white">
            <p className="text-xs text-gray-500 mb-1">Support Hours</p>
            <p className="text-sm text-gray-900">Mon–Sat, 8:00 AM – 7:00 PM EAT</p>
          </div>
        </div>
      </div>
    </div>
  );
}