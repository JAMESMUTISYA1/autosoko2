"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Search, ShieldCheck, Lock, Ban, Eye } from "lucide-react";
import { formatRelativeTime } from "@/lib/messaging";

const POLL_INTERVAL_MS = 8000;

export default function MessagesInboxPage() {
  const [conversations, setConversations] = useState(null); // null = initial loading
  const [search, setSearch] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    fetchConversations(search);

    function startPolling() {
      stopPolling();
      pollRef.current = setInterval(() => fetchConversations(search), POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    function handleVisibility() {
      if (document.hidden) stopPolling();
      else {
        fetchConversations(search);
        startPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function fetchConversations(searchTerm) {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/v1/conversations?${params.toString()}`);
      const json = await res.json();
      if (json.success) setConversations(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  const loading = conversations === null;
  const empty = !loading && conversations.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-6">Messages</h1>

      {!loading && conversations.length > 0 && (
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full border border-line rounded-md pl-9 pr-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
          />
        </div>
      )}

      {loading ? (
        <div className="border border-line rounded-md divide-y divide-line animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-card shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-card rounded w-1/3" />
                <div className="h-3 bg-card rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="max-w-lg mx-auto py-16 text-center">
          <MessageCircle size={36} className="mx-auto mb-4 text-muted" />
          <h2 className="font-display text-xl mb-2">No messages yet</h2>
          <p className="text-sm text-muted">Message a seller from any product page to start a conversation.</p>
        </div>
      ) : (
        <div className="border border-line rounded-md divide-y divide-line overflow-hidden">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/account/messages/${c.business.id}`}
              className="flex items-center gap-3 p-4 hover:bg-card transition-colors"
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm overflow-hidden">
                  {c.business.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.business.logoUrl} alt={c.business.name} className="w-full h-full object-cover" />
                  ) : (
                    c.business.name.charAt(0)
                  )}
                </div>
                {c.business.verificationStatus === "verified" && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-bg flex items-center justify-center">
                    <ShieldCheck size={9} className="text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${c.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                    {c.business.name}
                  </span>
                  <span className="text-xs text-muted shrink-0">
                    {c.lastMessageAt ? formatRelativeTime(c.lastMessageAt) : ""}
                  </span>
                </div>
                {c.product && (
                  <p className="text-xs text-muted truncate">About: {c.product.name}</p>
                )}
                <p className={`text-sm truncate ${c.unreadCount > 0 ? "text-fg" : "text-muted"}`}>
                  {c.lastMessage
                    ? c.lastMessage.messageType === "system"
                      ? c.lastMessage.body
                      : c.lastMessage.body
                    : "No messages yet"}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-400 text-blue-900 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Safety section — sits just above the site footer */}
      <div className="mt-14 pt-8 border-t border-line">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-yellow-400" />
          </div>
          <h2 className="font-display text-base">Keeping your messages safe</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SafetyTip
            icon={Lock}
            title="Pay on AutoSoko"
            body="Only pay through AutoSoko's checkout. If a seller asks you to pay directly or off-platform, decline and report them."
          />
          <SafetyTip
            icon={Eye}
            title="Everything's logged"
            body="Messages are tied to your account and kept for your records, so there's always a trail if something goes wrong."
          />
          <SafetyTip
            icon={Ban}
            title="Report bad behaviour"
            body="Pressure to move off-platform, requests for upfront transfers, or anything that feels off — report it and we'll look into it."
          />
        </div>
      </div>
    </div>
  );
}

function SafetyTip({ icon: Icon, title, body }) {
  return (
    <div className="border border-line rounded-md p-4 bg-card">
      <Icon size={16} className="text-blue-700 mb-2" />
      <p className="text-sm font-medium mb-1">{title}</p>
      <p className="text-xs text-muted leading-relaxed">{body}</p>
    </div>
  );
}
