import { TrendingUp, DollarSign, ShoppingBag, Wallet } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { formatPrice } from "@/data/sampleData";
import { monthlyRevenue, revenueByCountry, financeSummary } from "@/data/adminFinanceData";

export default function AdminFinancePage() {
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenueMinor));

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Financial Analysis</h1>
      <p className="text-sm text-muted mb-8">
        Platform-wide revenue, fees, and payouts across all countries.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total Revenue"
          value={formatPrice(financeSummary.totalRevenueMinor, "KES")}
          icon={DollarSign}
          sublabel="Last 6 months"
        />
        <StatCard
          label="Platform Fees"
          value={formatPrice(financeSummary.platformFeesMinor, "KES")}
          icon={TrendingUp}
          sublabel="5% avg commission"
        />
        <StatCard
          label="Seller Payouts"
          value={formatPrice(financeSummary.totalPayoutsMinor, "KES")}
          icon={Wallet}
          sublabel="Paid to sellers"
        />
        <StatCard
          label="Avg Order Value"
          value={formatPrice(financeSummary.avgOrderValueMinor, "KES")}
          icon={ShoppingBag}
          sublabel={`${financeSummary.totalOrders.toLocaleString()} orders`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Monthly revenue bar chart — plain divs, no charting dependency */}
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-6">Monthly Revenue</h2>
          <div className="flex items-end justify-between gap-3 h-48">
            {monthlyRevenue.map((m) => {
              const heightPct = (m.revenueMinor / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-mono text-muted">
                    {formatPrice(m.revenueMinor, "KES").replace("KES", "").trim()}
                  </span>
                  <div
                    className="w-full bg-accent rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%`, minHeight: "4px" }}
                  />
                  <span className="text-xs text-muted">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by country */}
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-5">Revenue by Country</h2>
          <div className="space-y-4">
            {revenueByCountry.map((c) => (
              <div key={c.country}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>{c.country}</span>
                  <span className="font-mono text-muted">{Math.round(c.share * 100)}%</span>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${c.share * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
