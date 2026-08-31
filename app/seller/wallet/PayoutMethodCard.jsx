"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

export default function PayoutMethodCard({ payoutMethod, onUpdate }) {
  const toast = useToast();
  const [form, setForm] = useState({
    phoneNumber: payoutMethod?.phoneNumber || "",
    bankName: payoutMethod?.bankName || "",
    bankAccountName: payoutMethod?.bankAccountName || "",
    bankAccountNumber: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/seller/wallet/payout-method", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payout details saved");
        onUpdate();
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="font-semibold mb-1">Payout Details</h3>
      <p className="text-sm text-gray-500 mb-4">Where your withdrawals get sent.</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">M-Pesa / Mobile Money Number</label>
          <input
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          {payoutMethod?.phoneVerified ? (
            <p className="text-xs text-green-600 mt-1">Verified</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Not verified yet</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Bank name"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          <input
            placeholder="Bank account name"
            value={form.bankAccountName}
            onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <input
            placeholder={payoutMethod?.bankAccountMasked ? `Current: ${payoutMethod.bankAccountMasked} — leave blank to keep` : "Bank account number"}
            value={form.bankAccountNumber}
            onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Only the last 4 digits are ever stored.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Payout Details"}
        </button>
      </form>
    </div>
  );
}