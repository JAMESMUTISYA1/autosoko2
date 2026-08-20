"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { Mail } from "lucide-react";
import ContactMessagesList from "@/components/dashboard/ContactMessagesList";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

export default function AgentSupportPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/support")
      .then((r) => r.json())
      .then((json) => setMessages(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl flex items-center gap-2"><Mail size={22} /> Contact Messages</h1>
        <Suspense fallback={null}><DateRangeFilter /></Suspense>
      </div>
      <p className="text-sm text-muted mb-8">Messages submitted through the public Contact Us form.</p>
      {loading ? <p className="text-sm text-muted">Loading...</p> : <ContactMessagesList initialMessages={messages} currentActorName={session?.user?.name || "Agent"} />}
    </div>
  );
}
