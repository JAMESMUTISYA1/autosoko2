"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Loader2, Radar, BadgeCheck, Send, MapPin, Calendar, X } from "lucide-react";
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
  const [closing, setClosing] = useState(false);

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

  async function handleClose() {
    if (!session?.user) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/v1/part-requests/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // closes by default
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message || "Could not close request");
        return;
      }
      toast.success("Request closed");
      load(); // refresh to update status and UI
    } catch {
      toast.error("Network error");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Radar size={40} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Request not found</h2>
          <p className="text-gray-500 text-sm mb-6">
            This request may have been removed or is no longer available.
          </p>
          <a href="/part-radar" className="inline-block bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors">
            Back to Part Radar
          </a>
        </div>
      </div>
    );
  }

  const isOwner = session?.user?.id === request.userId;
  const isOpen = request.status === "open";
  const hasImage = Boolean(request.imageUrl);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <a href="/part-radar" className="hover:text-blue-600">Part Radar</a>
          <span>/</span>
          <span className="text-gray-800 truncate">{request.partName}</span>
        </div>

        {/* Request Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-display text-white">{request.partName}</h1>
                {request.vehicleInfo && (
                  <p className="text-blue-100 text-sm mt-1">{request.vehicleInfo}</p>
                )}
              </div>
              {isOpen ? (
                <span className="shrink-0 inline-flex items-center gap-1 bg-yellow-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full">
                  <Radar size={12} />
                  OPEN
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center gap-1 bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                  CLOSED
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {/* Image Section */}
            {hasImage ? (
              <div className="relative aspect-video rounded-md overflow-hidden border border-gray-200 mb-4">
                <Image
                  src={request.imageUrl}
                  alt={request.partName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-300 p-10 mb-4">
                <div className="text-center">
                  <Radar size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No image provided</p>
                </div>
              </div>
            )}

            {request.description && (
              <p className="text-gray-700 text-sm leading-relaxed mb-4">{request.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
              {request.partNumber && (
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">#{request.partNumber}</span>
                </div>
              )}
              {request.town?.name && (
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-blue-500" />
                  {request.town.name}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(request.createdAt).toLocaleDateString()}
              </span>
              <span>Posted by {request.requesterName}</span>
            </div>

            {/* Close Request Button (owner only and open) */}
            {isOwner && isOpen && (
              <div className="mt-4">
                <button
                  onClick={handleClose}
                  disabled={closing}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-60 transition-colors"
                >
                  {closing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  Close Request
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Responses Section */}
        <div className="mb-8">
          <h2 className="text-xl font-display text-gray-900 mb-4">
            {request.responses?.length || 0} Response{(request.responses?.length || 0) !== 1 ? "s" : ""}
          </h2>
          {request.responses?.length > 0 ? (
            <div className="space-y-3">
              {request.responses.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                      {r.business.name}
                      {r.business.verificationStatus === "verified" && (
                        <BadgeCheck size={14} className="text-blue-500" />
                      )}
                    </span>
                    {r.priceMinor ? (
                      <span className="text-sm font-mono text-gray-900">
                        {formatPrice(r.priceMinor, "KES")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Price on request</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{r.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-500">No responses yet. Be the first to respond!</p>
            </div>
          )}
        </div>

        {/* Response Form (only if open) */}
        {isOpen && (
          <form onSubmit={handleRespond} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-100">
              <h3 className="font-semibold text-yellow-900 text-sm">Have this part? Respond as your store</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="I have this in stock, condition..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Price (KES, optional)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {session?.user ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-6 py-3 rounded-md disabled:opacity-60 transition-colors"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? "Sending..." : "Send Response"}
                </button>
              ) : (
                <a
                  href="/auth/login"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 rounded-md transition-colors"
                >
                  Sign in to Respond
                </a>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}