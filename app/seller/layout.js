import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentSellerStore } from "@/data/sellerData";

const SELLER_NAV = [
  { href: "/seller", label: "Overview", icon: "LayoutDashboard" },
  { href: "/seller/listings", label: "My Listings", icon: "Package" },
  { href: "/seller/listings/new", label: "Create Listing", icon: "PlusCircle" },
  { href: "/seller/wallet", label: "Wallet", icon: "Wallet" },
  { href: "/seller/sponsorship", label: "Sponsorship", icon: "Megaphone" },
  { href: "/seller/profile", label: "Profile", icon: "UserCircle" },
];

export default function SellerLayout({ children }) {
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
