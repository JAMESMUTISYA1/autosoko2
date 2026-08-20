"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Radar, BadgeCheck, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { formatPrice } from "@/data/sampleData";
import { useToast } from "@/contexts/ToastContext";

export default function PartRequestDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const toast = useToast();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch(`/api/v1/part-requests/${params.id}`).catch(() => null);
    const json = await res?.json().catch(() => null);
    setRequest(json?.success ? json.data : null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function handleRespond(e) {
    e.preventDefault();
    if (!session?.user) {
      toast.info("Sign in as a seller to respond");
      return;
    }
    if (!message.trim()) return;

    setSubmitting(true);
    // Note: this demo doesn't have a "which of my businesses" picker —
    // real usage would let a multi-business owner choose. Left as a
    // known simplification since Part Radar is a new feature this pass.
    const res = await fetch(`/api/v1/part-requests/${params.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: session.user.businessId,
        message,
        priceMinor: price ? Math.round(Number(price) * 100) : undefined,
      }),
    }).catch(() => null);
    setSubmitting(false);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Couldn't send your response");
      return;
    }

    toast.success("Response sent");
    setMessage("");
    setPrice("");
    load();
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-6 py-16 text-center text-sm text-muted">Loading...</div>;
  }
  if (!request) {
    return <div className="max-w-2xl mx-auto px-6 py-16 text-center text-sm text-muted">Request not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 text-xs text-muted mb-4">
        <Radar size={14} />
        Part Radar
      </div>

      <div className="border border-line rounded-md p-5 mb-6">
        <h1 className="font-display text-xl mb-1">{request.partName}</h1>
        {request.vehicleInfo && <p className="text-sm text-muted mb-3">{request.vehicleInfo}</p>}
        {request.imageUrl && (
          <div className="relative aspect-video rounded-sm overflow-hidden border border-line mb-3">
            <Image src={request.imageUrl} alt={request.partName} fill className="object-cover" />
          </div>
        )}
        {request.description && <p className="text-sm mb-3">{request.description}</p>}
        {request.partNumber && (
          <p className="text-xs font-mono text-muted">Part #: {request.partNumber}</p>
        )}
        <p className="text-xs text-muted mt-3">
          Posted by {request.requesterName} · {new Date(request.createdAt).toLocaleDateString()}
        </p>
      </div>

      <h2 className="font-display text-lg mb-3">
        {request.responses.length} Response{request.responses.length !== 1 ? "s" : ""}
      </h2>
      <div className="space-y-3 mb-6">
        {request.responses.map((r) => (
          <div key={r.id} className="border border-line rounded-md p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {r.business.name}
                {r.business.verificationStatus === "verified" && <BadgeCheck size={13} className="text-fg" />}
              </span>
              {r.priceMinor && (
                <span className="text-sm font-mono">{formatPrice(r.priceMinor, "KES")}</span>
              )}
            </div>
            <p className="text-sm text-muted">{r.message}</p>
          </div>
        ))}
        {request.responses.length === 0 && (
          <p className="text-sm text-muted">No responses yet.</p>
        )}
      </div>

      <form onSubmit={handleRespond} className="border border-line rounded-md p-4 space-y-3">
        <h3 className="text-sm font-medium">Have this part? Respond as your store</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="I have this in stock, condition..."
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent resize-none"
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price (KES, optional)"
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Send Response
        </button>
      </form>
    </div>
  );
}
