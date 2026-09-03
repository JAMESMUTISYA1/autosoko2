"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentSellerStore } from "@/data/sellerData";

const SELLER_NAV = [
  { href: "/seller", label: "Overview", icon: "LayoutDashboard" },
  { href: "/seller/orders", label: "Orders", icon: "Package" },
  { href: "/seller/messages", label: "Messages", icon: "MessageCircle" },
  { href: "/seller/vehicle-data", label: "Vehicle Data", icon: "Car" },
  { href: "/seller/listings", label: "Products", icon: "Car" },
  { href: "/seller/wallet", label: "Wallet", icon: "Wallet" },
  { href: "/seller/sponsorships", label: "Sponsorships", icon: "Megaphone" },
  { href: "/seller/profile", label: "Profile", icon: "UserCircle" },
];

// Mirrors AdminLayout's pattern: skip the dashboard chrome on the seller
// auth pages, since they shouldn't show the sidebar/nav for a logged-out
// visitor.
function SellerShell({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/seller/login" || pathname === "/seller/forgot-password";

  if (isAuthPage) {
    return <>{children}</>;
  }

  // NOTE: this now runs on every /seller page, which is fine as long as
  // getCurrentSellerStore() is safe to call for a signed-in seller. If it
  // reads directly from the DB/session server-side, keep it — this
  // component is only "use client" for usePathname, not because the data
  // fetch needs to be. If it turns out to be server-only (e.g. it calls
  // cookies() or your sellerAuth()), tell me and I'll split this into a
  // server layout + small client-only "which page am I on" wrapper instead.
  const store = getCurrentSellerStore();

  return (
    <DashboardShell
      navItems={SELLER_NAV}
      roleLabel="Seller"
      userName={store.name}
      userMeta={store.sellerType === "individual" ? "Individual Seller" : "Business"}
    >
      {children}
    </DashboardShell>
  );
}

// NEW: everything under /seller — including /seller/login — now sits
// inside a SessionProvider pointed at the seller auth API, so
// `useSession`/`signIn` calls talk to /api/seller-auth instead of the
// default /api/auth.
export default function SellerLayout({ children }) {
  return (
    <SessionProvider basePath="/api/seller-auth">
      <SellerShell>{children}</SellerShell>
    </SessionProvider>
  );
}