"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CURRENT_ADMIN } from "@/data/adminData";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/businesses", label: "Businesses", icon: "Users" },
  { href: "/admin/vehicle-data", label: "Vehicle Data", icon: "Car" },
  { href: "/admin/accounts", label: "Accounts", icon: "ShieldOff" },
  { href: "/admin/orders", label: "Orders", icon: "Package" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "Banknote" },
  { href: "/admin/addresses", label: "Addresses", icon: "ShieldCheck" },
  { href: "/admin/delivery", label: "Delivery Methods", icon: "Truck" },
  { href: "/admin/sponsorships", label: "Sponsorships", icon: "Megaphone" },
  { href: "/admin/support", label: "Contact Messages", icon: "Mail" },
  { href: "/admin/finance", label: "Finance", icon: "TrendingUp" },
  { href: "/admin/documents", label: "Documents", icon: "FileText" },
  { href: "/admin/profile", label: "Profile", icon: "UserCircle" },
];

// Unchanged from your version — decides whether to show the dashboard chrome.
function AdminShell({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/admin/login" || pathname === "/admin/forgot-password";

  if (isAuthPage) {
    return <>{children}</>;
  }

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

// NEW: everything under /admin — auth pages included — now sits inside a
// SessionProvider pointed at the admin auth API, so `useSession`/`signIn`
// calls anywhere under /admin (including the login page) talk to
// /api/admin-auth instead of the default /api/auth.
export default function AdminLayout({ children }) {
  return (
    <SessionProvider basePath="/api/admin-auth">
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}