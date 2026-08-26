export const dynamic = 'force-dynamic';
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  MapPin,
  MessageCircle,
  Heart,
  ShoppingCart,
  Package,
  User,
  Menu,
  X,
  ChevronDown,
  Phone,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import SearchBar from "@/components/search/SearchBar";
import { useSession, signOut } from "next-auth/react";

const NAV_LINKS = [
  { label: "Shop by Vehicle", href: "/search?mode=vehicle" },
  { label: "Categories", href: "/search" },
  { label: "Part Radar", href: "/part-radar" },
  { label: "Services", href: "/services" },
  { label: "Sell on AutoSoko", href: "/seller/listings/new" },
  { label: "Business Accounts", href: "/business" },
  { label: "Contact Us", href: "/contact" },
];

const ICON_LINKS = [
  { href: "/account/messages", label: "Messages", icon: MessageCircle },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/wishlist", label: "Saved", icon: Heart },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount } = useCart();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to check if a link is active (including query string matching)
  const isActive = (href) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    for (const [key, value] of params.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 font-body">
        {/* Utility bar – blue background */}
        <div className="bg-accent text-white text-xs">
          {/* Mobile: three key links */}
          <div className="md:hidden flex items-center justify-center gap-4 px-3 py-1">
            <Link href="/help" className="hover:text-white/80 transition-colors">
              Help Center
            </Link>
            <span className="text-white/50">|</span>
            <Link href="/business" className="hover:text-white/80 transition-colors">
              Business Accounts
            </Link>
            <span className="text-white/50">|</span>
            <Link href="/contact" className="hover:text-white/80 transition-colors">
              Contact Us
            </Link>
          </div>

          {/* Desktop: full utility bar */}
          <div className="hidden md:flex items-center justify-between px-6 py-1.5">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} />
              <span>Delivering across Kenya, Uganda, Tanzania, Rwanda</span>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/help" className="hover:text-white/80 transition-colors">
                Help Center
              </Link>
              <Link href="/business" className="hover:text-white/80 transition-colors">
                Business Accounts
              </Link>
              <Link href="/contact" className="flex items-center gap-1 hover:text-white/80 transition-colors">
                <Phone size={12} />
                Contact Us
              </Link>
              <button className="flex items-center gap-1 hover:text-white/80 transition-colors">
                English <ChevronDown size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Main header – white background */}
        <div className="bg-white text-fg px-3 sm:px-4 md:px-6 py-2 md:py-2.5 border-b border-line">
          <div className="flex items-center gap-3 md:gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <span className="font-display text-xl sm:text-2xl tracking-tight text-fg">
                AUTO<span className="border-b-2 border-accent">SOKO</span>
              </span>
            </Link>

            {/* Desktop search – with white background and border */}
            <div className="hidden md:flex flex-1 max-w-2xl bg-white border border-gray-300 rounded-md overflow-hidden">
              <SearchBar variant="desktop" />
            </div>

            {/* Desktop right icons */}
            <div className="hidden md:flex items-center gap-4 lg:gap-5 ml-auto text-sm">
              {ICON_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex flex-col items-center gap-0.5 hover:text-accent transition-colors"
                  >
                    <Icon size={20} />
                    <span className="text-[11px]">{link.label}</span>
                  </Link>
                );
              })}
              <Link href="/cart" className="relative flex flex-col items-center gap-0.5 hover:text-accent transition-colors">
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-accent text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
                <span className="text-[11px]">Cart</span>
              </Link>
              {status === "authenticated" ? (
                <div className="relative group">
                  <button className="flex items-center gap-2 hover:text-accent transition-colors">
                    <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold">
                      {session.user?.name?.charAt(0) || "?"}
                    </span>
                    <span className="text-sm">{session.user?.name?.split(" ")[0]}</span>
                  </button>
                  <div className="absolute right-0 top-full pt-2 hidden group-hover:block">
                    <div className="bg-white border border-line rounded-md shadow-xl shadow-black/10 py-1.5 w-44 text-fg">
                      <Link href="/account/orders" className="block px-4 py-2 text-sm hover:bg-gray-50">
                        My Orders
                      </Link>
                      <Link href="/seller" className="block px-4 py-2 text-sm hover:bg-gray-50">
                        Seller Dashboard
                      </Link>
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors"
                >
                  <User size={16} />
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile right icons + hamburger */}
            <div className="md:hidden ml-auto flex items-center gap-3">
              <Link href="/cart" className="relative" aria-label="Cart">
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-accent text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className="p-2"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile search – with white background and border */}
          <div className="md:hidden mt-2 bg-white border border-gray-300 rounded-md overflow-hidden">
            <SearchBar variant="mobile" />
          </div>
        </div>

        {/* Secondary nav – very light gray background (desktop only) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 bg-gray-50 text-gray-700 px-6 py-2 text-sm border-b border-line overflow-x-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap pb-1 transition-colors ${
                isActive(link.href)
                  ? "text-yellow-500 font-semibold border-b-2 border-yellow-500"
                  : "hover:text-accent"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile drawer – outside header, high z-index, white background, visible links */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden">
          {/* Overlay */}
          <button
            type="button"
            className="absolute inset-0 w-full h-full bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />

          {/* Drawer */}
          <aside className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white text-gray-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <span className="font-display text-lg text-gray-900">
                AUTO<span className="border-b-2 border-accent">SOKO</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <nav className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block py-2.5 text-sm transition-colors ${
                      isActive(link.href)
                        ? "text-yellow-500 font-semibold border-b-2 border-yellow-500"
                        : "text-gray-800 hover:text-accent"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-gray-200">
                {ICON_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-col items-center gap-1.5 py-3 text-xs text-gray-800 rounded-sm hover:bg-gray-100 transition-colors"
                    >
                      <Icon size={20} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200">
              {status === "authenticated" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center justify-center gap-2 border border-gray-300 text-gray-800 font-semibold px-4 py-3 rounded-sm w-full hover:bg-gray-100"
                >
                  <User size={16} />
                  Sign Out ({session.user?.name?.split(" ")[0]})
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 bg-accent text-white font-semibold px-4 py-3 rounded-sm"
                >
                  <User size={16} />
                  Sign In
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}