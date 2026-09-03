"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function IncomeTab({ businessId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/admin/businesses/${businessId}/income`)
    
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <Loader2 className="animate-spin text-blue-600" size={32} />;
  if (!data) return <p className="text-sm text-gray-500">Failed to load income data.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <InfoCard label="Total Income" value={`KES ${(data.totalIncome / 100).toLocaleString()}`} />
      <InfoCard label="This Month" value={`KES ${(data.monthIncome / 100).toLocaleString()}`} />
      <InfoCard label="Pending Payouts" value={`KES ${(data.pendingPayout / 100).toLocaleString()}`} />
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}