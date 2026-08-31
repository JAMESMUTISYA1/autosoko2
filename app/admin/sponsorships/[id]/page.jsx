"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, DollarSign, Phone, Mail } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { STATUS_META } from "@/lib/sponsorships";
import { formatMoney } from "@/lib/orders";

export default function AdminSponsorshipDetailPage({ params }) {
  const { id } = params;
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showQuote, setShowQuote] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [duration, setDuration] = useState("");
  const [quoteNote, setQuoteNote] = useState("");

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const toast = useToast();

  useEffect(() => { fetchRow(); }, [id]);

  async function fetchRow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/sponsorships/${id}`);
      const json = await res.json();
      if (json.success) setRow(json.data);
      else toast.error(json.error?.message || "Could not load sponsorship");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function submitQuote(e) {
    e.preventDefault();
    if (!amount || !duration) {
      toast.error("Amount and duration are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/sponsorships/${id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor: Math.round(Number(amount) * 100),
          currency,
          durationDays: Number(duration),
          quoteNote: quoteNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Quote sent to the seller");
        setShowQuote(false);
        fetchRow();
      } else {
        toast.error(json.error?.message || "Could not send quote");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyPayment() {
    if (!confirm(`Confirm payment of ${formatMoney(row.amountMinor, row.currency)} was received? This activates the boost immediately.`)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/sponsorships/${id}/verify-payment`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment verified — sponsorship is now active");
        fetchRow();
      } else {
        toast.error(json.error?.message || "Could not verify payment");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReject(e) {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error("A reason is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/sponsorships/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Sponsorship rejected");
        setShowReject(false);
        fetchRow();
      } else {
        toast.error(json.error?.message || "Could not reject");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600 mx-auto mt-16" size={32} />;
  if (!row) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500">Sponsorship not found.</p>
        <Link href="/admin/sponsorships" className="text-blue-600 text-sm underline mt-2 inline-block">Back</Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[row.effectiveStatus] || { label: row.effectiveStatus, badge: "bg-gray-100 text-gray-600" };

  return (
    <div className="max-w-2xl">
      <Link href="/admin/sponsorships" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Back to sponsorships
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-md bg-gray-100 shrink-0 overflow-hidden">
            {row.product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.product.imageUrl} alt={row.product.name} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl">{row.product.name}</h1>
            <p className="text-sm text-gray-500">
              List price {formatMoney(row.product.listPriceMinor, row.product.listCurrency)} · SKU {row.product.sku || "—"}
            </p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${statusMeta.badge}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Business */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Business</h2>
          <p className="text-sm text-gray-900">{row.business?.name}</p>
          {row.business?.phone && <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1"><Phone size={13} /> {row.business.phone}</p>}
          {row.business?.email && <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1"><Mail size={13} /> {row.business.email}</p>}
        </div>

        {row.requestNote && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Seller's request</h2>
            <p className="text-sm text-gray-600">{row.requestNote}</p>
            <p className="text-xs text-gray-400 mt-1">by {row.requestedBy} · {new Date(row.requestedAt).toLocaleString()}</p>
          </div>
        )}

        {row.amountMinor != null && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Quote</h2>
            <p className="text-sm text-gray-900">{formatMoney(row.amountMinor, row.currency)} for {row.durationDays} days</p>
            {row.quoteNote && <p className="text-sm text-gray-500 mt-1">"{row.quoteNote}"</p>}
            <p className="text-xs text-gray-400 mt-1">by {row.quotedBy} · {new Date(row.quotedAt).toLocaleString()}</p>
          </div>
        )}

        {row.effectiveStatus === "active" && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
            Live from {new Date(row.startAt).toLocaleDateString()} to {new Date(row.endAt).toLocaleDateString()}
            {row.daysRemaining != null && ` · ${row.daysRemaining} day${row.daysRemaining === 1 ? "" : "s"} left`}
          </div>
        )}
        {row.effectiveStatus === "expired" && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600">
            Ended {row.endAt ? new Date(row.endAt).toLocaleDateString() : "—"}.
          </div>
        )}
        {row.status === "rejected" && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
            Rejected: {row.rejectionReason}
          </div>
        )}
        {row.status === "cancelled" && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600">
            Withdrawn by the seller{row.cancelReason && `: "${row.cancelReason}"`}
          </div>
        )}

        {/* Actions */}
        {(row.canQuote || row.canVerifyPayment || row.canReject) && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-2">
            {row.canQuote && (
              <button
                onClick={() => setShowQuote(true)}
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
              >
                <DollarSign size={16} /> Send Quote
              </button>
            )}
            {row.canVerifyPayment && (
              <button
                onClick={verifyPayment}
                disabled={submitting}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> Verify Payment &amp; Activate
              </button>
            )}
            {row.canReject && (
              <button
                onClick={() => setShowReject(true)}
                className="inline-flex items-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-sm px-4 py-2 rounded-md"
              >
                <XCircle size={16} /> Reject
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quote modal */}
      {showQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setShowQuote(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Send Quote</h2>
            <form onSubmit={submitQuote} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount</label>
                  <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
                  <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration (days)</label>
                <input type="number" min="1" max="365" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <textarea value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} rows={2} maxLength={1000} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowQuote(false)} disabled={submitting} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-md">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-blue-900 text-sm font-semibold py-2.5 rounded-md disabled:opacity-60">
                  {submitting ? "Sending..." : "Send Quote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setShowReject(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Reject Sponsorship</h2>
            <form onSubmit={submitReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason (required)</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm" required />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowReject(false)} disabled={submitting} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-md">
                  Never mind
                </button>
                <button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-md disabled:opacity-60">
                  {submitting ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
