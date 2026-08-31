"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function PayoutTab({ businessId }) {
  const [payout, setPayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ phoneNumber: "", bankName: "", bankAccountName: "", bankAccountNumber: "" });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/v1/admin/businesses/${businessId}/payout`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPayout(json.data);
          setForm({
            phoneNumber: json.data.phoneNumber || "",
            bankName: json.data.bankName || "",
            bankAccountName: json.data.bankAccountName || "",
            bankAccountNumber: "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/businesses/${businessId}/payout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payout details saved");
        setPayout(json.data);
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader2 className="animate-spin text-blue-600" size={32} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">M-Pesa / Mobile Money Number</label>
        <input
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        />
        {payout?.phoneVerified && <p className="text-xs text-green-600 mt-1">Verified</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Bank Name</label>
        <input
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Bank Account Name</label>
        <input
          value={form.bankAccountName}
          onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Bank Account Number{" "}
          {payout?.bankAccountMasked && <span className="text-gray-400">(currently {payout.bankAccountMasked})</span>}
        </label>
        <input
          value={form.bankAccountNumber}
          onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
          placeholder="Leave blank to keep unchanged"
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
  );
}