import { ShieldCheck, Package, Clock } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { agents, getPendingVerifications, getAgentOrders, cityName } from "@/data/adminData";

const CURRENT_AGENT = agents[0];

export default async function AgentOverviewPage() {
  const [verifications, orders] = await Promise.all([
    getPendingVerifications(CURRENT_AGENT.cityId),
    getAgentOrders(CURRENT_AGENT.cityId),
  ]);

  const activeOrders = orders.filter((o) => o.status !== "delivered");

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">
        Welcome back, {CURRENT_AGENT.name.split(" ")[0]}
      </h1>
      <p className="text-sm text-muted mb-8">
        Your queue for {cityName(CURRENT_AGENT.cityId)}.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Pending Verifications"
          value={verifications.length}
          icon={ShieldCheck}
          sublabel="Awaiting your review"
        />
        <StatCard
          label="Active Orders"
          value={activeOrders.length}
          icon={Package}
          sublabel="Need status updates"
        />
        <StatCard
          label="Lifetime Verifications"
          value={CURRENT_AGENT.stats.verificationsCompleted}
          icon={Clock}
          sublabel="Since you joined"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-line rounded-md">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-base">Verification Queue</h2>
            <a href="/agent/verifications" className="text-xs text-muted hover:text-fg">Review all →</a>
          </div>
          {verifications.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted text-center">
              No pending verifications right now.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {verifications.slice(0, 4).map((v) => (
                <li key={v.id} className="px-5 py-3 text-sm">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-muted">{v.type} · Submitted {v.submittedAt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-line rounded-md">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-base">Orders Needing Updates</h2>
            <a href="/agent/orders" className="text-xs text-muted hover:text-fg">Manage all →</a>
          </div>
          {activeOrders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted text-center">
              All caught up — no active orders.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {activeOrders.slice(0, 4).map((o) => (
                <li key={o.id} className="px-5 py-3 text-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium font-mono">{o.orderNumber}</p>
                    <p className="text-xs text-muted">{o.businessName}</p>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-sm border border-line capitalize">
                    {o.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
