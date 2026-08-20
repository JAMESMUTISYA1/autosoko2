import { Package, Wallet, TrendingUp, ShieldCheck } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { formatPrice } from "@/data/sampleData";
import { getCurrentSellerStore, getCurrentSellerListings, wallet } from "@/data/sellerData";

export default function SellerOverviewPage() {
  const store = getCurrentSellerStore();
  const listings = getCurrentSellerListings();
  const totalUnitsSold = listings.reduce((sum, p) => sum + (p.unitsSold || 0), 0);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Welcome back, {store.name}</h1>
      <p className="text-sm text-muted mb-8">
        {store.verified ? (
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-fg" />
            Your seller account is verified
          </span>
        ) : (
          "Complete verification to unlock the trust badge on your listings."
        )}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Active Listings" value={listings.length} icon={Package} />
        <StatCard label="Units Sold" value={totalUnitsSold} icon={TrendingUp} />
        <StatCard
          label="Available Balance"
          value={formatPrice(wallet.availableMinor, wallet.currency)}
          icon={Wallet}
          sublabel="Ready to withdraw"
        />
        <StatCard
          label="Pending Balance"
          value={formatPrice(wallet.pendingMinor, wallet.currency)}
          icon={Wallet}
          sublabel="Clears after delivery"
        />
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
