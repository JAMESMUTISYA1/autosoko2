"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import { formatRelativeTime } from "@/lib/messaging";

const POLL_INTERVAL_MS = 8000;

export default function SellerMessagesPage() {
  const [conversations, setConversations] = useState(null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchConversations();

    function startPolling() {
      stopPolling();
      pollRef.current = setInterval(fetchConversations, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    function handleVisibility() {
      if (document.hidden) stopPolling();
      else {
        fetchConversations();
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
  }, [search, unreadOnly]);

  async function fetchConversations() {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (unreadOnly) params.set("unread", "true");
      const res = await fetch(`/api/v1/seller/conversations?${params.toString()}`);
      const json = await res.json();
      if (json.success) setConversations(json.data);
    } catch (err) {
      console.error(err);
    }
  }

  const loading = conversations === null;
  const empty = !loading && conversations.length === 0;
  const totalUnread = loading ? 0 : conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl mb-1">Messages</h1>
        <p className="text-sm text-muted">
          Conversations with buyers. Any team member can reply.
          {totalUnread > 0 && <span className="ml-1 text-blue-900 font-medium">{totalUnread} unread.</span>}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer name..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1 border border-gray-200 rounded-md p-1 w-fit">
          <button
            onClick={() => setUnreadOnly(false)}
            className={`px-3 py-1.5 text-sm rounded-sm font-medium ${!unreadOnly ? "bg-blue-900 text-white" : "text-gray-600"}`}
          >
            All
          </button>
          <button
            onClick={() => setUnreadOnly(true)}
            className={`px-3 py-1.5 text-sm rounded-sm font-medium ${unreadOnly ? "bg-blue-900 text-white" : "text-gray-600"}`}
          >
            Unread
          </button>
        </div>
      </div>

      {loading ? (
        <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="text-center py-16 text-gray-400">
          <MessageCircle size={32} className="mx-auto mb-2" />
          <p className="text-sm">{unreadOnly ? "No unread messages." : "No conversations yet."}</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 overflow-hidden">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/seller/messages/${c.id}`}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-blue-900 text-yellow-400 flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                {c.buyer.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.buyer.avatarUrl} alt={c.buyer.fullName} className="w-full h-full object-cover" />
                ) : (
                  c.buyer.fullName.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${c.unreadCount > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
                    {c.buyer.fullName}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {c.lastMessageAt ? formatRelativeTime(c.lastMessageAt) : ""}
                  </span>
                </div>
                {c.product && <p className="text-xs text-gray-400 truncate">About: {c.product.name}</p>}
                <p className={`text-sm truncate ${c.unreadCount > 0 ? "text-gray-900" : "text-gray-500"}`}>
                  {c.lastMessage?.body || "No messages yet"}
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
    </div>
  );
}
