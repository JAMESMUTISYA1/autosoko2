"use client";
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Send, ShieldAlert, ShieldCheck, ArrowLeft, ArrowDown, AlertTriangle,
  Check, CheckCheck, Clock, RotateCw,
} from "lucide-react";
import { groupMessagesByDay, formatMessageTime, mightContainContactInfo, MAX_MESSAGE_LENGTH } from "@/lib/messaging";

const POLL_INTERVAL_MS = 3000;
const NEAR_BOTTOM_PX = 150;

function Thread({ storeId }) {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product");

  const [conversationId, setConversationId] = useState(null);
  const [viewerId, setViewerId] = useState(null);
  const [business, setBusiness] = useState(null);
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
  const messagesRef = useRef(messages); // avoid stale closures in the poll loop
  messagesRef.current = messages;

  const contactWarning = mightContainContactInfo(draft);

  // ---- bootstrap: find-or-create the conversation, then load it ----
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const createRes = await fetch("/api/v1/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: storeId, productSlug: productSlug || undefined }),
        });
        const createJson = await createRes.json();
        if (!createJson.success) {
          if (!cancelled) setError(createJson.error?.message || "Could not open this conversation.");
          return;
        }
        const id = createJson.data.id;

        const res = await fetch(`/api/v1/conversations/${id}`);
        const json = await res.json();
        if (!json.success) {
          if (!cancelled) setError(json.error?.message || "Could not load this conversation.");
          return;
        }
        if (cancelled) return;

        setConversationId(id);
        setViewerId(json.data.viewerId);
        setBusiness(json.data.business);
        setProduct(json.data.product);
        setMessages(json.data.messages);
        setHasMoreOlder(json.data.hasMoreOlder);
        markRead(id);
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
  }, [storeId, productSlug]);

  // ---- polling for new messages ----
  useEffect(() => {
    if (!conversationId) return;

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
          ? `/api/v1/conversations/${conversationId}/messages?after=${lastReal.id}`
          : `/api/v1/conversations/${conversationId}/messages`; // nothing to anchor on yet — plain fetch
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data.messages.length > 0) {
          const wasNearBottom = isNearBottom();
          setMessages((prev) => dedupeAppend(prev, json.data.messages));
          markRead(conversationId);
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
  }, [conversationId]);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }

  function scrollToBottom(smooth) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    setShowNewMessagePill(false);
  }

  async function markRead(id) {
    try {
      await fetch(`/api/v1/conversations/${id}/read`, { method: "POST" });
    } catch {
      // best-effort, not critical to retry
    }
  }

  async function loadOlder() {
    if (!conversationId || loadingOlder || !hasMoreOlder || messages.length === 0) return;
    setLoadingOlder(true);
    const oldestId = messages[0]?.id;
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages?before=${oldestId}`);
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
    if (!text || sending || !conversationId) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      senderId: viewerId,
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
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
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
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-card rounded w-1/2" />
          <div className="h-[60vh] bg-card rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-muted mb-3">{error || "Conversation not found."}</p>
        <Link href="/account/messages" className="text-sm text-blue-700 underline">Back to messages</Link>
      </div>
    );
  }

  const dayGroups = groupMessagesByDay(messages);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/account/messages" className="text-muted hover:text-fg shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm overflow-hidden">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              business.name.charAt(0)
            )}
          </div>
          {business.verificationStatus === "verified" && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-bg flex items-center justify-center">
              <ShieldCheck size={9} className="text-white" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <Link href={`/stores/${business.slug}`} className="font-display text-lg truncate hover:underline">
            {business.name}
          </Link>
          <p className="text-xs text-muted">
            {business.status === "active" ? "Usually replies within a few hours" : "This seller is currently inactive"}
          </p>
        </div>
      </div>

      {/* Product context card */}
      {product && (
        <Link
          href={`/products/${product.slug}`}
          className="flex items-center gap-3 border border-line rounded-md p-3 mb-4 bg-card hover:border-fg transition-colors"
        >
          <div className="w-11 h-11 rounded-md bg-bg shrink-0 overflow-hidden border border-line">
            {product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted">Discussing</p>
            <p className="text-sm font-medium truncate">{product.name}</p>
          </div>
        </Link>
      )}

      <div className="relative border border-line rounded-md flex flex-col h-[60vh]">
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-1">
          {loadingOlder && (
            <p className="text-center text-xs text-muted py-2">Loading earlier messages...</p>
          )}

          {messages.length === 0 ? (
            <p className="text-sm text-muted text-center mt-10">
              Say hello — ask about price, availability, or fitment.
            </p>
          ) : (
            dayGroups.map((group) => (
              <div key={group.key}>
                <div className="flex justify-center my-3">
                  <span className="text-[11px] font-medium text-muted bg-card px-2.5 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>
                {group.messages.map((m) => (
                  <MessageBubble key={m.id} message={m} viewerId={viewerId} onRetry={retryFailed} />
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

        <form onSubmit={send} className="border-t border-line p-3">
          {contactWarning && (
            <p className="flex items-center gap-1.5 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-sm px-2.5 py-1.5 mb-2">
              <AlertTriangle size={12} className="shrink-0" />
              Looks like this might include contact info — for your safety, keep chats and payments on AutoSoko.
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={business.status !== "active"}
              className="flex-1 border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg disabled:opacity-50"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim() || sending || business.status !== "active"}
              className="w-10 h-10 rounded-sm bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors shrink-0 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted mt-3">
        <ShieldAlert size={13} className="shrink-0" />
        For your safety, keep all communication and payments on AutoSoko.
      </p>
    </div>
  );
}

function MessageBubble({ message, viewerId, onRetry }) {
  if (message.messageType === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted bg-bg px-3 py-1.5 rounded-md text-center max-w-[85%]">
          {message.body}
        </span>
      </div>
    );
  }

  const isMe = message.senderId === viewerId;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1.5`}>
      <div
        className={`max-w-[75%] text-sm px-3.5 py-2.5 rounded-md ${
          isMe ? "bg-accent text-white" : "bg-card border border-line"
        } ${message.failed ? "opacity-60" : ""}`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isMe ? "text-white/70" : "text-muted"}`}>
            {formatMessageTime(message.createdAt)}
          </span>
          {isMe && !message.failed && (
            message.pending ? (
              <Clock size={11} className="text-white/60" />
            ) : message.readAt ? (
              <CheckCheck size={13} className="text-white" />
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
  );
}

// Drops any incoming message whose id we already have (a real message can
// arrive via poll after we already merged it from the send response).
function dedupeAppend(prev, incoming) {
  const existingIds = new Set(prev.filter((m) => !m.pending).map((m) => m.id));
  const fresh = incoming.filter((m) => !existingIds.has(m.id));
  return [...prev, ...fresh];
}

export default function MessageThreadPage({ params }) {
  return (
    <Suspense fallback={null}>
      <Thread storeId={params.storeId} />
    </Suspense>
  );
}
