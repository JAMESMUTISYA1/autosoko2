export const dynamic = 'force-dynamic';
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, ShieldAlert } from "lucide-react";
import { stores, featuredProducts } from "@/data/sampleData";

function Thread({ storeId }) {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product");
  const store = stores.find((s) => s.id === storeId);
  const product = featuredProducts.find((p) => p.slug === productSlug);

  const [messages, setMessages] = useState(
    product
      ? [
          {
            id: 1,
            from: "system",
            text: `You're messaging ${store?.name || "the seller"} about "${product.name}".`,
          },
        ]
      : []
  );
  const [draft, setDraft] = useState("");

  function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: prev.length + 1, from: "me", text: draft.trim() }]);
    setDraft("");
  }

  if (!store) {
    return <p className="text-sm text-muted">Conversation not found.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm">
          {store.name.charAt(0)}
        </div>
        <div>
          <h1 className="font-display text-lg">{store.name}</h1>
          <p className="text-xs text-muted">Usually replies within a few hours</p>
        </div>
      </div>

      <div className="border border-line rounded-md flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted text-center mt-10">
              Say hello — ask about price, availability, or fitment.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[75%] text-sm px-3.5 py-2.5 rounded-md ${
                  m.from === "me"
                    ? "bg-fg text-bg ml-auto"
                    : m.from === "system"
                    ? "bg-bg text-muted text-xs mx-auto text-center"
                    : "bg-card border border-line"
                }`}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-fg"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="w-10 h-10 rounded-sm bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted mt-3">
        <ShieldAlert size={13} className="shrink-0" />
        For your safety, keep all communication and payments on AutoSoko.
      </p>
    </div>
  );
}

export default function MessageThreadPage({ params }) {
  return (
    <Suspense fallback={null}>
      <Thread storeId={params.storeId} />
    </Suspense>
  );
}
