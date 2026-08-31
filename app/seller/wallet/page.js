"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import PayoutMethodCard from "./PayoutMethodCard";
import RequestWithdrawalCard from "./RequestWithdrawalCard";
import WithdrawalHistoryTable from "./WithdrawalHistoryTable";
import EligibleOrdersList from "./EligibleOrdersList";

export default function SellerWalletPage() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, ordersRes, withdrawalsRes] = await Promise.all([
        fetch("/api/v1/seller/wallet"),
        fetch("/api/v1/seller/wallet/eligible-orders"),
        fetch("/api/v1/seller/wallet/withdrawals"),
      ]);
      const summaryJson = await summaryRes.json();
      const ordersJson = await ordersRes.json();
      const withdrawalsJson = await withdrawalsRes.json();

      if (summaryJson.success) setSummary(summaryJson.data);
      if (ordersJson.success) setOrders(ordersJson.data);
      if (withdrawalsJson.success) setWithdrawals(withdrawalsJson.data);
    } catch {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading || !summary) return <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />;

  const { currency, availableBalance, pendingWithdrawalTotal, lifetimePaidOut, payoutMethod } = summary;
  const hasPayoutMethod = Boolean(payoutMethod?.phoneNumber || payoutMethod?.bankAccountMasked);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Wallet</h1>
      <p className="text-sm text-muted mb-6">Your earnings, pending payouts, and withdrawal history.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <BalanceCard
          icon={<Wallet size={18} className="text-green-600" />}
          label="Available Balance"
          value={`${currency} ${(availableBalance / 100).toLocaleString()}`}
          tone="green"
        />
        <BalanceCard
          icon={<Clock size={18} className="text-yellow-600" />}
          label="Pending Payout"
          value={`${currency} ${(pendingWithdrawalTotal / 100).toLocaleString()}`}
          tone="yellow"
        />
        <BalanceCard
          icon={<CheckCircle2 size={18} className="text-blue-600" />}
          label="Lifetime Paid Out"
          value={`${currency} ${(lifetimePaidOut / 100).toLocaleString()}`}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RequestWithdrawalCard
          availableBalance={availableBalance}
          currency={currency}
          hasPayoutMethod={hasPayoutMethod}
          onRequested={fetchAll}
        />
        <PayoutMethodCard payoutMethod={payoutMethod} onUpdate={fetchAll} />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">What Makes Up Your Balance</h2>
        <EligibleOrdersList orders={orders} currency={currency} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Withdrawal History</h2>
        <WithdrawalHistoryTable withdrawals={withdrawals} currency={currency} onUpdate={fetchAll} />
      </div>
    </div>
  );
}

function BalanceCard({ icon, label, value, tone }) {
  const borders = { green: "border-green-200", yellow: "border-yellow-200", blue: "border-blue-200" };
  return (
    <div className={`bg-white border ${borders[tone]} rounded-lg p-4 shadow-sm`}>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        {icon} {label}
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}