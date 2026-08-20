"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { Menu, X, LogOut } from "lucide-react";

export default function DashboardShell({
  navItems,
  roleLabel,
  userName,
  userMeta, // e.g. assigned city, shown under the name
  children,
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
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
    <div className="min-h-screen flex bg-bg text-fg">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line bg-card">
        <div className="px-5 py-4 border-b border-line">
          <Link href="/" className="font-display text-lg tracking-tight">
            AUTO<span className="border-b-2 border-accent">SOKO</span>
          </Link>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-1">
            {roleLabel}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = Icons[item.icon] || Icons.Circle;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-sm transition-colors ${
                  active
                    ? "bg-accent text-white font-medium"
                    : "text-muted hover:bg-bg hover:text-fg"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-line">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted hover:text-fg transition-colors">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Floating toggle — fixed on screen, always reachable regardless of scroll position */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        className="md:hidden fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-lg shadow-black/20 flex items-center justify-center hover:bg-accent/90 transition-colors"
      >
        <Menu size={22} />
      </button>

      {/* Mobile drawer — floating overlay, not inline */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-invert/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[80%] max-w-xs bg-card border-r border-line flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <div>
                <span className="font-display text-lg">
                  AUTO<span className="border-b-2 border-accent">SOKO</span>
                </span>
                <p className="text-[11px] text-muted uppercase tracking-wider mt-1">
                  {roleLabel}
                </p>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = Icons[item.icon] || Icons.Circle;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm text-sm ${
                      active ? "bg-accent text-white font-medium" : "text-muted"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-end gap-4 px-4 md:px-8 py-3.5 border-b border-line bg-card">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{userName}</p>
              {userMeta && <p className="text-xs text-muted leading-tight">{userMeta}</p>}
            </div>
            <div className="w-9 h-9 rounded-full bg-invert text-invert-fg flex items-center justify-center font-display text-sm shrink-0">
              {userName?.charAt(0) || "?"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
