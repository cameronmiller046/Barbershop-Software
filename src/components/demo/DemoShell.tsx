"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/home/icons";
import { classNames as cx } from "@/lib/utils";
import { useDemo, staffById } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Avatar } from "@/components/demo/ui";
import type { DemoRole } from "@/lib/demo/types";

type NavItem = { label: string; href: string; icon: IconName; exact?: boolean };
type NavGroup = { heading?: string; items: NavItem[] };

const ADMIN_NAV: NavGroup[] = [
  { items: [
    { label: "Dashboard", href: "/demo/admin", icon: "home", exact: true },
    { label: "Calendar", href: "/demo/admin/calendar", icon: "calendar" },
    { label: "Customers", href: "/demo/admin/customers", icon: "customers" },
    { label: "Services", href: "/demo/admin/services", icon: "scissors" },
    { label: "Staff", href: "/demo/admin/staff", icon: "staff" },
    { label: "Scheduling", href: "/demo/admin/scheduling", icon: "clock" },
  ] },
  { heading: "Business", items: [
    { label: "Inventory", href: "/demo/admin/inventory", icon: "inventory" },
    { label: "Payroll", href: "/demo/admin/payroll", icon: "dollar" },
    { label: "Reports", href: "/demo/admin/reports", icon: "reports" },
    { label: "Analytics", href: "/demo/admin/analytics", icon: "analytics" },
    { label: "Financials", href: "/demo/admin/financials", icon: "gauge" },
    { label: "Marketing", href: "/demo/admin/marketing", icon: "marketing" },
  ] },
  { heading: "System", items: [
    { label: "Notifications", href: "/demo/admin/notifications", icon: "bell" },
    { label: "Store Settings", href: "/demo/admin/settings", icon: "settings" },
  ] },
];

const BARBER_NAV: NavGroup[] = [
  { items: [
    { label: "Today", href: "/demo/barber", icon: "home", exact: true },
    { label: "My Calendar", href: "/demo/barber/calendar", icon: "calendar" },
    { label: "My Schedule", href: "/demo/barber/schedule", icon: "clock" },
    { label: "Availability", href: "/demo/barber/availability", icon: "checkin" },
  ] },
  { heading: "Chair", items: [
    { label: "Customers", href: "/demo/barber/customers", icon: "customers" },
    { label: "Checkout", href: "/demo/barber/checkout", icon: "dollar" },
    { label: "Before / After", href: "/demo/barber/photos", icon: "star" },
    { label: "Time Clock", href: "/demo/barber/timeclock", icon: "clock" },
  ] },
  { heading: "Earnings", items: [
    { label: "Tips", href: "/demo/barber/tips", icon: "loyalty" },
    { label: "Commission", href: "/demo/barber/commission", icon: "growth" },
    { label: "My Profile", href: "/demo/barber/profile", icon: "profiles" },
  ] },
];

export function DemoShell({ role, children }: { role: DemoRole; children: React.ReactNode }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isAdmin = role === "demo_admin";
  const groups = isAdmin ? ADMIN_NAV : BARBER_NAV;
  const base = isAdmin ? "/demo/admin" : "/demo/barber";
  const acting = isAdmin ? staffById(state, "s_owner") : staffById(state, state.currentStaffId);
  const unread = state.notifications.filter((n) => !n.read).length;

  const isActive = (i: NavItem) =>
    i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/");

  const doReset = () => { actions.reset(); toast("Sandbox reset to its starting state", "success"); };

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <Link href={base} className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 10V6a2 2 0 0 1 2-2h1M18 10V6a2 2 0 0 0-2-2h-1" /><rect x="5" y="10" width="14" height="6" rx="1.5" /><path d="M7 16v4M17 16v4M4 20h16" />
          </svg>
        </span>
        <span className="leading-none">
          <span className="block font-display text-[15px] text-cream">The Chair</span>
          <span className="block text-[9px] uppercase tracking-[0.2em] text-brass/70">{isAdmin ? "Owner Demo" : "Barber Demo"}</span>
        </span>
      </Link>

      <nav className="p-scroll flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.heading && <div className="px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/30">{g.heading}</div>}
            {g.items.map((i) => {
              const I = Icon[i.icon];
              const active = isActive(i);
              const showBadge = i.label === "Notifications" && unread > 0;
              return (
                <Link key={i.href} href={i.href} className={cx("p-nav", active && "p-nav-active")}>
                  <I className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{i.label}</span>
                  {showBadge && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-brass px-1 text-[10px] font-bold text-[#17130a]">{unread}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-3">
        <button onClick={doReset} className="p-nav w-full text-left text-cream/70 hover:text-brass">
          <Icon.spark className="h-5 w-5 shrink-0" /><span>Reset sandbox</span>
        </button>
        <Link href="/login" className="p-nav w-full text-cream/60 hover:text-cream">
          <Icon.logout className="h-5 w-5 shrink-0" /><span>Exit demo</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="portal flex min-h-screen flex-col">
      {/* Demo banner — scrolls away on mobile so the sticky header doesn't stack
          two bars and eat the top of every screen. */}
      <div className="z-40 flex items-center justify-center gap-3 border-b border-brass/30 bg-gradient-to-r from-[#2a2314] via-[#1c1710] to-[#2a2314] px-4 py-2 text-center">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brass/20 text-brass">
          <Icon.spark className="h-3.5 w-3.5" />
        </span>
        <p className="text-xs text-brass/95 sm:text-sm">
          <span className="font-semibold text-brass">Demo Mode</span>
          <span className="mx-2 hidden text-brass/40 sm:inline">·</span>
          <span className="hidden sm:inline">You&apos;re exploring a temporary sandbox. Changes aren&apos;t saved and reset when the page is refreshed.</span>
          <span className="sm:hidden"> — nothing here is saved.</span>
        </p>
        <button onClick={doReset} className="hidden shrink-0 rounded-full border border-brass/40 px-3 py-1 text-xs font-semibold text-brass transition hover:bg-brass/10 sm:inline-block">
          Reset
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 border-r border-white/8 bg-[#0c0b0e]/90 backdrop-blur md:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/10 bg-[#0c0b0e] md:hidden">
              <Sidebar />
            </aside>
          </>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/8 bg-[#0a090c]/95 px-4 backdrop-blur sm:h-16 sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-cream md:hidden">
                <Icon.menu className="h-5 w-5" />
              </button>
              <span className="font-display text-lg text-cream">{state.settings.name.replace(" — Flagship", "")}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link href={`${base}/notifications`} className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream/70 transition hover:text-brass" aria-label="Notifications">
                  <Icon.bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brass px-1 text-[10px] font-bold text-[#17130a]">{unread}</span>}
                </Link>
              )}
              <div className="flex items-center gap-2.5 rounded-full border border-white/10 py-1 pl-1 pr-3">
                <Avatar name={acting?.name ?? "Demo"} color={acting?.color} size={28} />
                <span className="hidden leading-tight sm:block">
                  <span className="block text-xs font-medium text-cream">{acting?.name}</span>
                  <span className="text-[10px] text-cream/45">{acting?.level} · Demo</span>
                </span>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
