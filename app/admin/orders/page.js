"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import AgentOrdersList from "@/components/dashboard/AgentOrdersList";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/orders")
      .then((r) => r.json())
      .then((json) => setOrders(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Orders</h1>
        <Suspense fallback={null}><DateRangeFilter /></Suspense>
      </div>
      <p className="text-sm text-muted mb-8">Platform-wide orders, across all agent-covered cities.</p>
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : orders.length === 0 ? (
        <div className="bg-card border border-line rounded-md px-5 py-12 text-center">
          <p className="text-sm text-muted">No orders yet.</p>
        </div>
      ) : (
        <AgentOrdersList initialOrders={orders} currentActorName={session?.user?.name || "Admin"} />
      )}
    </div>
  );
}
