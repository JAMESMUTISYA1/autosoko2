export const dynamic = 'force-dynamic';
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { stores } from "@/data/sampleData";

// Mock inbox — a real implementation lists actual conversations via
// GET /api/v1/conversations. Showing a couple of stores here so the
// "Message Seller" flow from the product page has somewhere to return to.
const MOCK_CONVERSATIONS = [
  {
    storeId: "store-1",
    lastMessage: "Yes, this is compatible with the 2018 model.",
    time: "2h ago",
    unread: true,
  },
  {
    storeId: "store-4",
    lastMessage: "Thanks for your order! It ships tomorrow.",
    time: "1d ago",
    unread: false,
  },
];

export default function MessagesInboxPage() {
  const conversations = MOCK_CONVERSATIONS.map((c) => ({
    ...c,
    store: stores.find((s) => s.id === c.storeId),
  })).filter((c) => c.store);

  if (conversations.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <MessageCircle size={36} className="mx-auto mb-4 text-muted" />
        <h1 className="font-display text-xl mb-2">No messages yet</h1>
        <p className="text-sm text-muted">
          Message a seller from any product page to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-8">Messages</h1>

      <div className="border border-line rounded-md divide-y divide-line">
        {conversations.map((c) => (
          <Link
            key={c.storeId}
            href={`/account/messages/${c.storeId}`}
            className="flex items-center gap-3 p-4 hover:bg-card transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm shrink-0">
              {c.store.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.store.name}</span>
                <span className="text-xs text-muted shrink-0">{c.time}</span>
              </div>
              <p className={`text-sm truncate ${c.unread ? "text-fg" : "text-muted"}`}>
                {c.lastMessage}
              </p>
            </div>
            {c.unread && <span className="w-2 h-2 rounded-full bg-accent shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  );
}
