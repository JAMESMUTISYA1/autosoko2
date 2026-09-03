"use client";

const STATUS_COLORS = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-300",
  processing: "bg-blue-500",
  shipped: "bg-blue-700",
  delivered: "bg-blue-900",
  disputed: "bg-red-500",
  cancelled: "bg-gray-300",
  refunded: "bg-gray-300",
};

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  disputed: "Disputed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

// Fixed display order so the pipeline reads top-to-bottom logically
// rather than however the DB happened to group it.
const ORDER = ["pending", "confirmed", "processing", "shipped", "delivered", "disputed", "cancelled", "refunded"];

export default function OrdersByStatusChart({ data }) {
  const byStatus = Object.fromEntries((data || []).map((d) => [d.status, d.count]));
  const rows = ORDER.filter((s) => byStatus[s] > 0).map((s) => ({ status: s, count: byStatus[s] }));
  const max = Math.max(...rows.map((r) => r.count), 1);

  if (rows.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">No orders yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.status} className="flex items-center gap-2">
          <span className="text-xs text-muted w-[72px] shrink-0">{STATUS_LABELS[r.status]}</span>
          <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
            <div
              className={`h-full rounded-full ${STATUS_COLORS[r.status]}`}
              style={{ width: `${Math.max((r.count / max) * 100, 6)}%` }}
            />
          </div>
          <span className="text-xs font-medium w-6 text-right shrink-0">{r.count}</span>
        </div>
      ))}
    </div>
  );
}
