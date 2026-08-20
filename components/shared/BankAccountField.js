"use client";

import { useState } from "react";
import { Landmark, Check } from "lucide-react";

const BANKS = [
  "Equity Bank", "KCB Bank", "Co-operative Bank", "Absa Bank Kenya",
  "Standard Chartered", "NCBA Bank", "DTB Bank", "Stanbic Bank",
];

export default function BankAccountField({ onSaved, saved }) {
  const [bankName, setBankName] = useState(saved?.bankName || "");
  const [accountName, setAccountName] = useState(saved?.accountName || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(!saved);

  function handleSave(e) {
    e.preventDefault();
    setError("");

    if (!bankName || !accountName.trim()) {
      setError("Fill in bank and account holder name");
      return;
    }
    if (accountNumber.length < 6) {
      setError("Enter a valid account number");
      return;
    }
    if (accountNumber !== confirmAccountNumber) {
      setError("Account numbers don't match — check both fields");
      return;
    }

    onSaved({
      bankName,
      accountName,
      accountNumberMasked: `****${accountNumber.slice(-4)}`,
    });
    setEditing(false);
    setAccountNumber("");
    setConfirmAccountNumber("");
  }

  if (saved && !editing) {
    return (
      <div className="flex items-center justify-between border border-line rounded-sm px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm">
          <Landmark size={15} className="text-fg" />
          {saved.bankName} — {saved.accountNumberMasked}
          <span className="text-[11px] text-muted">{saved.accountName}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-accent hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 border border-line rounded-md p-4">
      <div>
        <label className="block text-xs text-muted mb-1.5">Bank</label>
        <select
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
        >
          <option value="">Select bank</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Account Holder Name</label>
        <input
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Account Number</label>
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm font-mono bg-bg focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1.5">Confirm Account Number</label>
        <input
          value={confirmAccountNumber}
          onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          onPaste={(e) => e.preventDefault()} // defeats the purpose of double-entry if pasted
          className="w-full border border-line rounded-sm px-3 py-2.5 text-sm font-mono bg-bg focus:outline-none focus:border-accent"
        />
        <p className="text-[11px] text-muted mt-1">
          Retype rather than paste — this catches typos, not copy-paste errors.
        </p>
      </div>

      {error && <p className="text-xs font-semibold">{error}</p>}

      <button
        type="submit"
        className="flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-sm hover:bg-accent/90 transition-colors"
      >
        <Check size={14} />
        Save Bank Account
      </button>
    </form>
  );
}
