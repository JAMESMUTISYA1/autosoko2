"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import VerificationsList from "@/components/dashboard/VerificationsList";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

export default function AdminVerificationsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/verifications")
      .then((r) => r.json())
      .then((json) => setItems(json.success ? json.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Verifications</h1>
        <Suspense fallback={null}><DateRangeFilter /></Suspense>
      </div>
      <p className="text-sm text-muted mb-8">
        Platform-wide pending business verifications, across all cities.
      </p>
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <VerificationsList initialVerifications={items} currentActorName={session?.user?.name || "Admin"} />
      )}
    </div>
  );
}
