import DashboardShell from "@/components/dashboard/DashboardShell";
import { CURRENT_ADMIN } from "@/data/adminData";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/agents", label: "Agents", icon: "Users" },
  { href: "/admin/accounts", label: "Accounts", icon: "ShieldOff" },
  { href: "/admin/verifications", label: "Verifications", icon: "ShieldCheck" },
  { href: "/admin/orders", label: "Orders", icon: "Package" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "Banknote" },
  { href: "/admin/delivery", label: "Delivery Methods", icon: "Truck" },
  { href: "/admin/support", label: "Contact Messages", icon: "Mail" },
  { href: "/admin/finance", label: "Finance", icon: "TrendingUp" },
  { href: "/admin/documents", label: "Documents", icon: "FileText" },
  { href: "/admin/profile", label: "Profile", icon: "UserCircle" },
];

export default function AdminLayout({ children }) {
  return (
    <DashboardShell
      navItems={ADMIN_NAV}
      roleLabel="Admin"
      userName={CURRENT_ADMIN.name}
      userMeta="Super Admin"
    >
      {children}
    </DashboardShell>
  );
}
