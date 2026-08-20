import { Users, ShieldCheck, Package, MapPin } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { getAgents, getPendingVerifications, getAgentOrders, cityName, cities } from "@/data/adminData";

export default async function AdminOverviewPage() {
  const [agents, verifications, orders] = await Promise.all([
    getAgents(),
    getPendingVerifications(),
    getAgentOrders(),
  ]);

  const activeAgents = agents.filter((a) => a.status === "active").length;
  const citiesCovered = new Set(agents.map((a) => a.cityId)).size;

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Overview</h1>
      <p className="text-sm text-muted mb-8">
        Platform-wide status across all agent-covered cities.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Active Agents" value={activeAgents} icon={Users} sublabel={`${agents.length} total`} />
        <StatCard label="Cities Covered" value={citiesCovered} icon={MapPin} sublabel={`of ${cities.length} target cities`} />
        <StatCard label="Pending Verifications" value={verifications.length} icon={ShieldCheck} />
        <StatCard label="Orders In Progress" value={orders.length} icon={Package} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-line rounded-md">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-base">Agents by City</h2>
            <a href="/admin/agents" className="text-xs text-muted hover:text-fg">View all →</a>
          </div>
          <ul className="divide-y divide-line">
            {agents.slice(0, 5).map((agent) => (
              <li key={agent.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-muted">{cityName(agent.cityId)}</p>
                </div>
                <span
                  className={`text-[11px] px-2 py-1 rounded-sm border ${
                    agent.status === "active" ? "border-fg" : "border-line text-muted"
                  }`}
                >
                  {agent.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card border border-line rounded-md">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-base">Recent Verification Requests</h2>
            <a href="/admin/verifications" className="text-xs text-muted hover:text-fg">View all →</a>
          </div>
          <ul className="divide-y divide-line">
            {verifications.slice(0, 5).map((v) => (
              <li key={v.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-muted">{v.type} · {cityName(v.cityId)}</p>
                </div>
                <span className="text-xs text-muted">{v.submittedAt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
