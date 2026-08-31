"use client";

import { useToast } from "@/contexts/ToastContext";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function WithdrawalHistoryTable({ withdrawals, currency, onUpdate }) {
  const toast = useToast();

  async function handleCancel(id) {
    if (!confirm("Cancel this withdrawal request?")) return;
    const res = await fetch(`/api/v1/seller/wallet/withdrawals/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Withdrawal cancelled");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to cancel");
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Amount</th>
            <th className="px-4 py-2.5 font-medium">Method</th>
            <th className="px-4 py-2.5 font-medium">Destination</th>
            <th className="px-4 py-2.5 font-medium">Orders</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {withdrawals.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-gray-500">No withdrawals yet.</td>
            </tr>
          )}
          {withdrawals.map((w) => (
            <tr key={w.id}>
              <td className="px-4 py-3 text-gray-600">{new Date(w.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 font-medium">{currency} {(w.amountMinor / 100).toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-600">{w.method}</td>
              <td className="px-4 py-3 text-gray-600">{w.destination}</td>
              <td className="px-4 py-3 text-gray-500">
                {w.payoutLinks.length} order{w.payoutLinks.length === 1 ? "" : "s"}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[w.status]}`}>
                  {w.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {w.status === "pending" && (
                  <button onClick={() => handleCancel(w.id)} className="text-red-600 text-xs font-medium hover:underline">
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}