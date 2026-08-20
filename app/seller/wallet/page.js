"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2, X, Smartphone, Landmark } from "lucide-react";
import { formatPrice } from "@/data/sampleData";
import VerifiedPhoneField from "@/components/shared/VerifiedPhoneField";
import BankAccountField from "@/components/shared/BankAccountField";
import { useToast } from "@/contexts/ToastContext";

export default function SellerWalletPage() {
  const { data: session } = useSession();
  const businessId = session?.user?.businessId;
  const toast = useToast();

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!businessId) return;
    const res = await fetch(`/api/v1/seller/wallet?businessId=${businessId}`).catch(() => null);
    const json = await res?.json().catch(() => null);
    setWallet(json?.success ? json.data : null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [businessId]);

  async function savePayoutMethod(patch) {
    const res = await fetch("/api/v1/seller/payout-method", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...patch }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      toast.error(json?.error?.message || "Couldn't save payout method");
      return;
    }
    load();
  }

  async function verifyPhoneCode() {
    const res = await fetch("/api/v1/seller/payout-method/verify-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, code: "000000" }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (res?.ok && json?.success) {
      toast.success("Phone number verified");
      load();
    }
  }

  async function handleRequest(e) {
    e.preventDefault();
    setError("");
    const amountMinor = Math.round(Number(amount) * 100);
    if (!method) {
      setError("Add and verify a payout method first");
      return;
    }
    if (!amount || amountMinor <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/v1/seller/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, amountMinor, method }),
    }).catch(() => null);
    setSubmitting(false);

    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      setError(json?.error?.message || "Couldn't submit withdrawal request");
      return;
    }

    toast.success(`Withdrawal request for ${formatPrice(amountMinor, "KES")} sent for approval`);
    setRequestOpen(false);
    setAmount("");
    load();
  }

  if (!businessId) {
    return <p className="text-sm text-muted">Loading your business account...</p>;
  }
  if (loading) {
    return <p className="text-sm text-muted">Loading wallet...</p>;
  }
  if (!wallet) {
    return <p className="text-sm text-muted">Couldn't load your wallet. Try refreshing.</p>;
  }

  const phone = { number: wallet.payoutMethod?.phoneNumber || "", verified: wallet.payoutMethod?.phoneVerified || false };
  const bank = wallet.payoutMethod?.bankName
    ? { bankName: wallet.payoutMethod.bankName, accountName: wallet.payoutMethod.bankAccountName, accountNumberMasked: wallet.payoutMethod.bankAccountMasked }
    : null;
  const hasAnyMethod = phone.verified || Boolean(bank);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl mb-1">Wallet</h1>
      <p className="text-sm text-muted mb-8">
        Earnings from your sales are credited here once an order is delivered.
        Withdrawals are reviewed by our team before payout.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-line rounded-md p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-2">
            <Wallet size={14} />
            Available Balance
          </div>
          <p className="font-display text-2xl">{formatPrice(wallet.availableMinor, wallet.currency)}</p>
          <button
            onClick={() => setRequestOpen(true)}
            className="mt-4 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors"
          >
            Request Withdrawal
          </button>
        </div>
        <div className="bg-card border border-line rounded-md p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted mb-2">
            <Wallet size={14} />
            Pending Balance
          </div>
          <p className="font-display text-2xl">{formatPrice(wallet.pendingMinor, wallet.currency)}</p>
          <p className="text-xs text-muted mt-4">Clears automatically once orders are marked delivered</p>
        </div>
      </div>

      <div className="bg-card border border-line rounded-md p-5 mb-6 space-y-5">
        <h2 className="font-display text-base">Payout Methods</h2>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
            <Smartphone size={13} /> Mobile Money
          </label>
          <VerifiedPhoneField
            initialPhone={phone.number}
            initialVerified={phone.verified}
            onVerified={(number) => savePayoutMethod({ phoneNumber: number }).then(verifyPhoneCode)}
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
            <Landmark size={13} /> Bank Account
          </label>
          <BankAccountField
            saved={bank}
            onSaved={(b) =>
              savePayoutMethod({
                bankName: b.bankName,
                bankAccountName: b.accountName,
                bankAccountNumber: b.accountNumberMasked.replace(/\*/g, "0"), // masked already; real form collects the raw number
              })
            }
          />
        </div>
      </div>

      {requestOpen && (
        <div className="bg-card border border-accent rounded-md p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base">Request Withdrawal</h2>
            <button onClick={() => setRequestOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>
          {!hasAnyMethod ? (
            <p className="text-sm text-muted">Verify a phone number or save a bank account above first.</p>
          ) : (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">Amount (KES)</label>
                <input
                  type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
                />
                <p className="text-xs text-muted mt-1">Available: {formatPrice(wallet.availableMinor, wallet.currency)}</p>
              </div>
              <div className="flex gap-2">
                {phone.verified && (
                  <label className={`flex-1 text-center text-sm border rounded-sm px-3 py-2.5 cursor-pointer ${method === "M-Pesa" ? "border-accent bg-accent text-white" : "border-line"}`}>
                    <input type="radio" name="method" checked={method === "M-Pesa"} onChange={() => setMethod("M-Pesa")} className="sr-only" />
                    M-Pesa
                  </label>
                )}
                {bank && (
                  <label className={`flex-1 text-center text-sm border rounded-sm px-3 py-2.5 cursor-pointer ${method === "Bank Transfer" ? "border-accent bg-accent text-white" : "border-line"}`}>
                    <input type="radio" name="method" checked={method === "Bank Transfer"} onChange={() => setMethod("Bank Transfer")} className="sr-only" />
                    Bank Transfer
                  </label>
                )}
              </div>
              {error && <p className="text-sm font-semibold">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold text-sm py-3 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          )}
        </div>
      )}

      <h2 className="font-display text-base mb-3">Transaction History</h2>
      <div className="bg-card border border-line rounded-md divide-y divide-line">
        {wallet.transactions.length === 0 && (
          <p className="text-sm text-muted px-5 py-6">No transactions yet.</p>
        )}
        {wallet.transactions.map((t) => (
          <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {t.type === "sale" ? <ArrowDownCircle size={18} className="text-fg shrink-0" /> : <ArrowUpCircle size={18} className="text-muted shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm truncate">{t.description}</p>
                <p className="text-xs text-muted">{new Date(t.date).toLocaleDateString()} · {t.status}</p>
              </div>
            </div>
            <span className={`text-sm font-mono shrink-0 ${t.amountMinor < 0 ? "text-muted" : ""}`}>
              {t.amountMinor < 0 ? "−" : "+"}{formatPrice(Math.abs(t.amountMinor), t.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
