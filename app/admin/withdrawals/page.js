"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import WithdrawalsList from "@/components/dashboard/WithdrawalsList";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

export default function AdminWithdrawalsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/withdrawals")
      .then((r) => r.json())
      .then((json) => setRequests(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Withdrawals</h1>
        <Suspense fallback={null}><DateRangeFilter /></Suspense>
      </div>
      <p className="text-sm text-muted mb-8">Seller payout requests. Approve, then mark paid once the transfer completes.</p>
      {loading ? <p className="text-sm text-muted">Loading...</p> : <WithdrawalsList initialRequests={requests} currentActorName={session?.user?.name || "Admin"} />}
    </div>
  );
}
