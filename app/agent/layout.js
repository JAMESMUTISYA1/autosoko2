import DashboardShell from "@/components/dashboard/DashboardShell";
import { agents, cityName } from "@/data/adminData";

const AGENT_NAV = [
  { href: "/agent", label: "Overview", icon: "LayoutDashboard" },
  { href: "/agent/verifications", label: "Verifications", icon: "ShieldCheck" },
  { href: "/agent/orders", label: "Orders", icon: "Package" },
  { href: "/agent/delivery", label: "Delivery Methods", icon: "Truck" },
  { href: "/agent/support", label: "Contact Messages", icon: "Mail" },
  { href: "/agent/profile", label: "Profile", icon: "UserCircle" },
];

// In the real app the signed-in agent comes from the session
// (Document 3's auth), not a lookup like this — this stands in for
// "the currently logged-in agent" until that exists.
const CURRENT_AGENT = agents[0];

export default function AgentLayout({ children }) {
  return (
    <DashboardShell
      navItems={AGENT_NAV}
      roleLabel="Agent"
      userName={CURRENT_AGENT.name}
      userMeta={cityName(CURRENT_AGENT.cityId)}
    >
      {children}
    </DashboardShell>
  );
}
