"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, ShoppingBag, Wallet, Loader2 } from "lucide-react";
import { formatPrice } from "@/data/sampleData";

export default function AdminFinancePage() {
  const [summary, setSummary] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [revenueByCountry, setRevenueByCountry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, monthlyRes, countryRes] = await Promise.all([
          fetch("/api/v1/admin/finance/summary"),
          fetch("/api/v1/admin/finance/monthly-revenue"),
          fetch("/api/v1/admin/finance/revenue-by-country"),
        ]);

        const [summaryJson, monthlyJson, countryJson] = await Promise.all([
          summaryRes.json(),
          monthlyRes.json(),
          countryRes.json(),
        ]);

        if (summaryJson.success) setSummary(summaryJson.data);
        if (monthlyJson.success) setMonthlyRevenue(monthlyJson.data);
        if (countryJson.success) setRevenueByCountry(countryJson.data);
      } catch (err) {
        setError("Failed to load finance data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenueMinor), 1);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Financial Analysis</h1>
      <p className="text-sm text-muted mb-8">
        Platform-wide revenue, fees, and payouts across all countries.
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total Revenue"
          value={formatPrice(summary.totalRevenueMinor, "KES")}
          icon={DollarSign}
          sublabel="Last 6 months"
        />
        <StatCard
          label="Platform Fees"
          value={formatPrice(summary.platformFeesMinor, "KES")}
          icon={TrendingUp}
          sublabel="5% avg commission"
        />
        <StatCard
          label="Seller Payouts"
          value={formatPrice(summary.totalPayoutsMinor, "KES")}
          icon={Wallet}
          sublabel="Paid to sellers"
        />
        <StatCard
          label="Avg Order Value"
          value={formatPrice(summary.avgOrderValueMinor, "KES")}
          icon={ShoppingBag}
          sublabel={`${summary.totalOrders.toLocaleString()} orders`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Monthly revenue bar chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-display text-base mb-6 text-gray-900">Monthly Revenue</h2>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyRevenue.map((m) => {
              const heightPct = (m.revenueMinor / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono text-gray-500">
                    {formatPrice(m.revenueMinor, "KES").replace("KES", "").trim()}
                  </span>
                  <div
                    className="w-full bg-blue-600 rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%`, minHeight: "4px" }}
                  />
                  <span className="text-xs text-gray-500">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by country */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="font-display text-base mb-5 text-gray-900">Revenue by Country</h2>
          <div className="space-y-4">
            {revenueByCountry.map((c) => (
              <div key={c.country}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-gray-700">{c.country}</span>
                  <span className="font-mono text-gray-500">{Math.round(c.share * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${c.share * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {revenueByCountry.length === 0 && (
              <p className="text-sm text-gray-500">No revenue data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// StatCard inline component (matching blue/yellow theme)
function StatCard({ label, value, icon: Icon, sublabel }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
        <Icon size={16} className="text-blue-600" />
        {label}
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}