"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, XCircle, Clock, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { STATUS_META } from "@/lib/sponsorships";
import { formatMoney } from "@/lib/orders";

export default function SellerSponsorshipDetailPage({ params }) {
  const { id } = params;
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchRow(); }, [id]);

  async function fetchRow() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/seller/sponsorships/${id}`);
      const json = await res.json();
      if (json.success) setRow(json.data);
      else toast.error(json.error?.message || "Could not load sponsorship");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/seller/sponsorships/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Sponsorship cancelled");
        setShowCancel(false);
        fetchRow();
      } else {
        toast.error(json.error?.message || "Could not cancel");
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
        <Link href="/seller/sponsorships" className="text-blue-600 text-sm underline mt-2 inline-block">Back</Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[row.effectiveStatus] || { label: row.effectiveStatus, badge: "bg-gray-100 text-gray-600" };

  return (
    <div className="max-w-2xl">
      <Link href="/seller/sponsorships" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
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
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${statusMeta.badge}`}>
              {statusMeta.label}
            </span>
          </div>
        </div>

        {/* Status-specific messaging */}
        <div className="mt-5">
          {row.status === "requested" && (
            <Notice icon={Clock} tone="amber">
              Waiting on an admin to review this request and send a quote.
            </Notice>
          )}
          {row.status === "quoted" && (
            <Notice icon={Info} tone="blue">
              Quoted at <strong>{formatMoney(row.amountMinor, row.currency)}</strong> for{" "}
              <strong>{row.durationDays} days</strong>. Pay via your usual channel and let the platform team know —
              they'll verify and activate it.
              {row.quoteNote && <p className="mt-2 text-sm">"{row.quoteNote}"</p>}
            </Notice>
          )}
          {row.effectiveStatus === "active" && (
            <Notice icon={CheckCircle2} tone="green">
              Live now. {row.daysRemaining != null && `${row.daysRemaining} day${row.daysRemaining === 1 ? "" : "s"} remaining.`}
              {" "}Runs until {row.endAt ? new Date(row.endAt).toLocaleDateString() : "—"}.
            </Notice>
          )}
          {row.effectiveStatus === "expired" && (
            <Notice icon={Clock} tone="gray">
              This boost ran from {row.startAt ? new Date(row.startAt).toLocaleDateString() : "—"} to{" "}
              {row.endAt ? new Date(row.endAt).toLocaleDateString() : "—"} and has ended.
            </Notice>
          )}
          {row.status === "rejected" && (
            <Notice icon={XCircle} tone="red">
              Declined by {row.rejectedBy || "an admin"}
              {row.rejectionReason && `: "${row.rejectionReason}"`}
            </Notice>
          )}
          {row.status === "cancelled" && (
            <Notice icon={XCircle} tone="gray">
              You cancelled this request{row.cancelReason && `: "${row.cancelReason}"`}
            </Notice>
          )}
        </div>

        {row.requestNote && (
          <div className="mt-4 text-sm text-gray-500">
            <span className="font-medium text-gray-700">Your note: </span>{row.requestNote}
          </div>
        )}

        <dl className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Requested</dt>
          <dd className="text-gray-900">{new Date(row.requestedAt).toLocaleString()}</dd>
          {row.quotedAt && (
            <>
              <dt className="text-gray-500">Quoted</dt>
              <dd className="text-gray-900">{new Date(row.quotedAt).toLocaleString()} by {row.quotedBy}</dd>
            </>
          )}
          {row.paymentVerifiedAt && (
            <>
              <dt className="text-gray-500">Payment verified</dt>
              <dd className="text-gray-900">{new Date(row.paymentVerifiedAt).toLocaleString()} by {row.paymentVerifiedBy}</dd>
            </>
          )}
        </dl>

        {row.canCancel && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            {!showCancel ? (
              <button
                onClick={() => setShowCancel(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <XCircle size={16} /> Withdraw this request
              </button>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Reason (optional)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancel(false)}
                    disabled={submitting}
                    className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-md"
                  >
                    Never mind
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={submitting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-md disabled:opacity-60"
                  >
                    {submitting ? "Cancelling..." : "Confirm Withdraw"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ icon: Icon, tone, children }) {
  const tones = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red: "bg-red-50 border-red-200 text-red-800",
    gray: "bg-gray-50 border-gray-200 text-gray-600",
  };
  return (
    <div className={`flex items-start gap-3 border rounded-md p-4 text-sm ${tones[tone]}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
