import { Users, ShieldCheck, Package, MapPin } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { db } from "@/lib/db";

export default async function AdminOverviewPage() {
  // Fetch agents: users with platform role "Agent"
  const agents = await db.user.findMany({
    where: {
      userRoles: {
        some: {
          role: { name: "Agent", scope: "platform" },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Pending business verifications
  const pendingVerifications = await db.business.findMany({
    where: { verificationStatus: "pending" },
    select: {
      id: true,
      name: true,
      businessType: true,
      town: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Orders in progress (not delivered, cancelled, refunded, or disputed)
  const ordersInProgress = await db.order.findMany({
    where: {
      status: { in: ["pending", "confirmed", "processing", "shipped"] },
    },
    select: { id: true },
  });

  // Count active agents
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;

  // Cities covered = distinct towns of all businesses
  const businessesTowns = await db.business.findMany({
    select: { townId: true },
    distinct: ["townId"],
  });
  const citiesCovered = businessesTowns.filter((b) => b.townId).length;

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Overview</h1>
      <p className="text-sm text-muted mb-8">
        Platform-wide status across all agent-covered cities.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Active Agents"
          value={activeAgents}
          icon={Users}
          sublabel={`${totalAgents} total`}
        />
        <StatCard
          label="Cities Covered"
          value={citiesCovered}
          icon={MapPin}
          sublabel="across all businesses"
        />
        <StatCard
          label="Pending Verifications"
          value={pendingVerifications.length}
          icon={ShieldCheck}
        />
        <StatCard
          label="Orders In Progress"
          value={ordersInProgress.length}
          icon={Package}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents List */}
        <div className="bg-card border border-line rounded-md">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-base">Agents</h2>
            <a href="/admin/agents" className="text-xs text-muted hover:text-fg">
              View all →
            </a>
          </div>
          <ul className="divide-y divide-line">
            {agents.slice(0, 5).map((agent) => (
              <li key={agent.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{agent.fullName}</p>
                  <p className="text-xs text-muted">{agent.email || agent.phone}</p>
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
            {agents.length === 0 && (
              <li className="px-5 py-3 text-sm text-muted">No agents yet.</li>
            )}
          </ul>
        </div>

        {/* Pending Verifications List */}
        <div className="bg-card border border-line rounded-md">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="font-display text-base">Recent Verification Requests</h2>
            <a href="/admin/verifications" className="text-xs text-muted hover:text-fg">
              View all →
            </a>
          </div>
          <ul className="divide-y divide-line">
            {pendingVerifications.slice(0, 5).map((v) => (
              <li key={v.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{v.name}</p>
                  <p className="text-xs text-muted">
                    {v.businessType} · {v.town?.name || "No town"}
                  </p>
                </div>
                <span className="text-xs text-muted">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
            {pendingVerifications.length === 0 && (
              <li className="px-5 py-3 text-sm text-muted">
                No pending verification requests.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}