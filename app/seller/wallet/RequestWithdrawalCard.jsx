"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function RequestWithdrawalCard({ availableBalance, currency, hasPayoutMethod, onRequested }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("M-Pesa");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const availableDisplay = (availableBalance / 100).toLocaleString();

  async function handleSubmit(e) {
    e.preventDefault();
    const amountMinor = Math.round(Number(amount) * 100);
    if (!amountMinor || amountMinor <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (amountMinor > availableBalance) {
      toast.error("Amount exceeds your available balance");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/seller/wallet/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMinor, method }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Withdrawal requested");
        setAmount("");
        onRequested();
      } else {
        toast.error(json.error?.message || "Failed to request withdrawal");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold mb-1">Request Withdrawal</h3>
      <p className="text-sm text-gray-500 mb-4">
        Available to withdraw: <span className="font-medium text-gray-900">{currency} {availableDisplay}</span>
      </p>

      {!hasPayoutMethod && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          Add your payout details below before requesting a withdrawal.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount ({currency})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            max={availableBalance / 100}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm">
            <option value="M-Pesa">M-Pesa</option>
            <option value="Airtel Money">Airtel Money</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting || availableBalance === 0}
          className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Requesting..." : "Request Withdrawal"}
        </button>
      </form>
    </div>
  );
}