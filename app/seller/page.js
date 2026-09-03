"use client";

import { useEffect, useState } from "react";
import { Package, Wallet, TrendingUp, ShieldCheck } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrdersByStatusChart from "@/components/dashboard/OrdersByStatusChart";
import { formatPrice } from "@/data/sampleData";

export default function SellerOverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/seller/overview");
        const json = await res.json();
        if (cancelled) return;
        if (json.success) setData(json.data);
        else setError(json.error?.message || "Could not load your dashboard.");
      } catch {
        if (!cancelled) setError("Network error — try refreshing.");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return <p className="text-sm text-muted">{error}</p>;
  }

  if (!data) {
    return (
      <div>
        <div className="h-7 bg-card rounded w-64 mb-2 animate-pulse" />
        <div className="h-4 bg-card rounded w-48 mb-8 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-line rounded-md p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-line rounded-md p-5 h-56 animate-pulse" />
          <div className="bg-card border border-line rounded-md p-5 h-56 animate-pulse" />
        </div>
      </div>
    );
  }

  const { business, stats, listings, revenueByDay, ordersByStatus } = data;

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Welcome back, {business.name}</h1>
      <p className="text-sm text-muted mb-8">
        {business.verificationStatus === "verified" ? (
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-fg" />
            Your seller account is verified
          </span>
        ) : (
          "Complete verification to unlock the trust badge on your listings."
        )}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Active Listings" value={stats.activeListings} icon={Package} />
        <StatCard label="Units Sold" value={stats.unitsSold} icon={TrendingUp} />
        <StatCard
          label="Available Balance"
          value={formatPrice(stats.availableMinor, business.homeCurrency)}
          icon={Wallet}
          sublabel="Ready to withdraw"
        />
        <StatCard
          label="Pending Balance"
          value={formatPrice(stats.pendingMinor, business.homeCurrency)}
          icon={Wallet}
          sublabel="Clears after delivery"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
        <div className="lg:col-span-2 bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-1">Revenue, last 30 days</h2>
          <p className="text-xs text-muted mb-4">Paid orders by day</p>
          <RevenueChart data={revenueByDay} currency={business.homeCurrency} />
        </div>
        <div className="bg-card border border-line rounded-md p-5">
          <h2 className="font-display text-base mb-1">Orders by status</h2>
          <p className="text-xs text-muted mb-4">All-time</p>
          <OrdersByStatusChart data={ordersByStatus} />
        </div>
      </div>

      <div className="bg-card border border-line rounded-md p-5">
        <h2 className="font-display text-base mb-3">Your Listings</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted">You haven't listed anything yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {listings.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <span className="text-xs text-muted">{p.unitsSold} sold</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
