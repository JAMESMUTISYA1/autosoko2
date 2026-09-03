"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Send, ShieldAlert, ArrowLeft, ArrowDown, AlertTriangle,
  Check, CheckCheck, Clock, RotateCw, Phone,
} from "lucide-react";
import { groupMessagesByDay, formatMessageTime, mightContainContactInfo, MAX_MESSAGE_LENGTH } from "@/lib/messaging";

const POLL_INTERVAL_MS = 3000;
const NEAR_BOTTOM_PX = 150;

export default function SellerThreadPage({ params }) {
  const { id: conversationId } = params;

  const [viewerId, setViewerId] = useState(null);
  const [buyer, setBuyer] = useState(null);
  const [product, setProduct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const contactWarning = mightContainContactInfo(draft);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/seller/conversations/${conversationId}`);
        const json = await res.json();
        if (!json.success) {
          if (!cancelled) setError(json.error?.message || "Could not load this conversation.");
          return;
        }
        if (cancelled) return;

        setViewerId(json.data.viewerId);
        setBuyer(json.data.buyer);
        setProduct(json.data.product);
        setMessages(json.data.messages);
        setHasMoreOlder(json.data.hasMoreOlder);
        markRead();
        requestAnimationFrame(() => scrollToBottom(false));
      } catch {
        if (!cancelled) setError("Network error — try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (loading) return;

    function startPolling() {
      stopPolling();
      pollRef.current = setInterval(pollForNew, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    function handleVisibility() {
      if (document.hidden) stopPolling();
      else {
        pollForNew();
        startPolling();
      }
    }

    async function pollForNew() {
      const current = messagesRef.current;
      const lastReal = [...current].reverse().find((m) => !m.pending);
      try {
        const url = lastReal
          ? `/api/v1/seller/conversations/${conversationId}/messages?after=${lastReal.id}`
          : `/api/v1/seller/conversations/${conversationId}/messages`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data.messages.length > 0) {
          const wasNearBottom = isNearBottom();
          setMessages((prev) => dedupeAppend(prev, json.data.messages));
          markRead();
          if (wasNearBottom) requestAnimationFrame(() => scrollToBottom(true));
          else setShowNewMessagePill(true);
        }
      } catch {
        // silent — next tick retries
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loading]);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  function scrollToBottom(smooth) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setShowNewMessagePill(false);
  }

  async function markRead() {
    try {
      await fetch(`/api/v1/seller/conversations/${conversationId}/read`, { method: "POST" });
    } catch {
      // best-effort
    }
  }

  async function loadOlder() {
    if (loadingOlder || !hasMoreOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestId = messages[0]?.id;
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    try {
      const res = await fetch(`/api/v1/seller/conversations/${conversationId}/messages?before=${oldestId}`);
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...json.data.messages, ...prev]);
        setHasMoreOlder(json.data.hasMoreOlder);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
        });
      }
    } catch {
      // silent
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 80) loadOlder();
    if (isNearBottom()) setShowNewMessagePill(false);
  }

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !viewerId) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      senderId: viewerId,
      senderName: "You",
      body: text,
      messageType: "text",
      createdAt: new Date().toISOString(),
      readAt: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      const res = await fetch(`/api/v1/seller/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...json.data, pending: false } : m)));
      } else {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m)));
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, failed: true, pending: false } : m)));
    } finally {
      setSending(false);
    }
  }

  function retryFailed(msg) {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setDraft(msg.body);
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-1/2" />
          <div className="h-[60vh] bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !buyer) {
    return (
      <div className="max-w-2xl text-center py-16">
        <p className="text-sm text-gray-500 mb-3">{error || "Conversation not found."}</p>
        <Link href="/seller/messages" className="text-sm text-blue-700 underline">Back to messages</Link>
      </div>
    );
  }

  const dayGroups = groupMessagesByDay(messages);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/seller/messages" className="text-gray-400 hover:text-gray-700 shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="w-10 h-10 rounded-full bg-blue-900 text-yellow-400 flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
          {buyer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={buyer.avatarUrl} alt={buyer.fullName} className="w-full h-full object-cover" />
          ) : (
            buyer.fullName.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-lg truncate">{buyer.fullName}</h1>
          {buyer.phone && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Phone size={11} /> {buyer.phone}
            </p>
          )}
        </div>
      </div>

      {product && (
        <div className="flex items-center gap-3 border border-gray-200 rounded-md p-3 mb-4 bg-white">
          <div className="w-11 h-11 rounded-md bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
            {product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400">Discussing</p>
            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
          </div>
        </div>
      )}

      <div className="relative border border-gray-200 rounded-lg bg-white flex flex-col h-[60vh]">
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-1">
          {loadingOlder && <p className="text-center text-xs text-gray-400 py-2">Loading earlier messages...</p>}

          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-10">No messages yet in this conversation.</p>
          ) : (
            dayGroups.map((group) => (
              <div key={group.key}>
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>
                {group.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} buyerId={buyer.id} viewerId={viewerId} onRetry={retryFailed} />
                ))}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {showNewMessagePill && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-blue-900 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-md hover:bg-blue-800"
          >
            <ArrowDown size={12} /> New message
          </button>
        )}

        <form onSubmit={send} className="border-t border-gray-200 p-3">
          {contactWarning && (
            <p className="flex items-center gap-1.5 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-sm px-2.5 py-1.5 mb-2">
              <AlertTriangle size={12} className="shrink-0" />
              This looks like it might include contact info — for everyone's safety, keep deals on AutoSoko.
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a reply..."
              maxLength={MAX_MESSAGE_LENGTH}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim() || sending}
              className="w-10 h-10 rounded-md bg-yellow-400 hover:bg-yellow-500 text-blue-900 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-400 mt-3">
        <ShieldAlert size={13} className="shrink-0" />
        Keep communication and payments on AutoSoko — it's how we can step in if something goes wrong.
      </p>
    </div>
  );
}

function MessageBubble({ message, buyerId, viewerId, onRetry }) {
  if (message.messageType === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-md text-center max-w-[85%]">
          {message.body}
        </span>
      </div>
    );
  }

  // Anything not sent by the buyer is a team reply — right-aligned,
  // regardless of which team member sent it.
  const isTeam = message.senderId !== buyerId;
  const isMine = message.senderId === viewerId;

  return (
    <div className={`flex ${isTeam ? "justify-end" : "justify-start"} mb-1.5`}>
      <div className={`max-w-[75%] ${isTeam ? "items-end" : "items-start"} flex flex-col`}>
        {isTeam && !isMine && message.senderName && (
          <span className="text-[10px] text-gray-400 mb-0.5 mr-1">{message.senderName}</span>
        )}
        <div
          className={`text-sm px-3.5 py-2.5 rounded-md ${
            isTeam ? "bg-blue-900 text-white" : "bg-gray-50 border border-gray-200 text-gray-900"
          } ${message.failed ? "opacity-60" : ""}`}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <div className={`flex items-center gap-1 mt-1 ${isTeam ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10px] ${isTeam ? "text-white/70" : "text-gray-400"}`}>
              {formatMessageTime(message.createdAt)}
            </span>
            {isTeam && !message.failed && (
              message.pending ? (
                <Clock size={11} className="text-white/60" />
              ) : message.readAt ? (
                <CheckCheck size={13} className="text-yellow-400" />
              ) : (
                <Check size={13} className="text-white/70" />
              )
            )}
            {message.failed && (
              <button onClick={() => onRetry(message)} className="flex items-center gap-1 text-[10px] text-red-100 underline ml-1">
                <RotateCw size={10} /> Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function dedupeAppend(prev, incoming) {
  const existingIds = new Set(prev.filter((m) => !m.pending).map((m) => m.id));
  const fresh = incoming.filter((m) => !existingIds.has(m.id));
  return [...prev, ...fresh];
}
