"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

const STATUS_OPTIONS = ["active", "suspended", "banned"];

export default function OverviewTab({ business, onUpdate }) {
  const [changingStatus, setChangingStatus] = useState(false);
  const toast = useToast();

  async function setStatus(status) {
    if (status === business.status) return;
    if (!confirm(`Change status to "${status}"?`)) return;
    
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${business.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Business ${status}`);
        onUpdate();
      } else {
        toast.error(json.error?.message || "Failed to update status");
      }
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard label="Products" value={business._count?.products || 0} />
        <InfoCard label="Members" value={business._count?.members || 0} />
        <InfoCard label="Branches" value={business._count?.branches || 0} />
        <InfoCard label="Orders" value={business._count?.orders || 0} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              disabled={changingStatus || s === business.status}
              onClick={() => setStatus(s)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 capitalize disabled:opacity-40 hover:bg-gray-50"
            >
              Set {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-2">Owner</h3>
        <p className="text-sm text-gray-600">{business.owner?.fullName}</p>
        <p className="text-sm text-gray-500">{business.owner?.email || business.owner?.phone}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold mb-2">Description</h3>
        <p className="text-sm text-gray-600">{business.description || "No description."}</p>
      </div>
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