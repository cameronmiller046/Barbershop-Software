"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "@/components/home/icons";
import { approveTimeEdit, rejectTimeEdit } from "@/app/portal/timeclock/actions";

type NavItem = { label: string; href: string; icon: IconName; exact?: boolean; perm?: string; plan?: boolean; soon?: boolean };

export type EditNotif = {
  id: string; barberName: string; createdISO: string; reason: string | null;
  currentIn: string; currentOut: string | null; proposedIn: string | null; proposedOut: string | null;
};

const PRIMARY: NavItem[] = [
  { label: "Dashboard", href: "/portal", icon: "home", exact: true },
  { label: "Appointments", href: "/portal/appointments", icon: "booking" },
  { label: "Clients", href: "/portal/clients", icon: "customers", perm: "shop.clients" },
  { label: "Portfolio", href: "/portal/portfolio", icon: "star" },
  { label: "Time Clock", href: "/portal/timeclock", icon: "clock" },
  { label: "My Requests", href: "/portal/feedback", icon: "messages" },
  // Account settings live in the sidebar footer (next to Log out) — no duplicate here.
];

const MANAGEMENT: NavItem[] = [
  { label: "Services", href: "/portal/services", icon: "scissors", perm: "shop.services" },
  { label: "Staff", href: "/portal/team", icon: "staff", perm: "shop.team" },
  { label: "Analytics", href: "/portal/reports", icon: "analytics", perm: "shop.viewAll", plan: true },
  { label: "Website Content", href: "/portal/website", icon: "store", perm: "shop.settings" },
  { label: "Booking Setup", href: "/portal/booking", icon: "clock", perm: "shop.settings" },
  { label: "Shop Settings", href: "/portal/settings", icon: "settings", perm: "shop.settings" },
  { label: "User Management", href: "/portal/team", icon: "users", perm: "shop.team" },
];

// Owner-only; shown separately since it isn't gated by a per-feature permission.
const BILLING: NavItem = { label: "Billing", href: "/portal/billing", icon: "crown" };

export function PortalShell({
  user, tenant, perms, reports, planLabel, showUpgrade, showBilling, siteUrl, demo, notifications, signOutAction, children,
}: {
  user: { name: string; roleLabel: string; email: string };
  tenant: { name: string };
  perms: Record<string, boolean>;
  reports: boolean;
  planLabel: string;
  showUpgrade: boolean;
  showBilling: boolean;
  siteUrl: string;
  demo: boolean;
  notifications: EditNotif[];
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<EditNotif[]>(notifications);
  useEffect(() => { setNotifOpen(false); }, [pathname]);

  // Near-real-time bell: poll a lightweight endpoint every few seconds (and on
  // tab focus) so incoming timeclock-edit requests appear without a page reload.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/portal/notifications", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (alive && Array.isArray(d.notifications)) setNotifs(d.notifications);
      } catch { /* transient — keep the last known list */ }
    };
    const id = setInterval(load, 4000);
    document.addEventListener("visibilitychange", load);
    load();
    return () => { alive = false; clearInterval(id); document.removeEventListener("visibilitychange", load); };
  }, []);

  // Drop a notification the moment it's approved/rejected; the next poll reconciles.
  const removeNotif = (id: string) => setNotifs((list) => list.filter((n) => n.id !== id));

  useEffect(() => {
    setCollapsed(localStorage.getItem("portalNavCollapsed") === "1");
  }, []);
  const toggleCollapse = () => setCollapsed((c) => { localStorage.setItem("portalNavCollapsed", c ? "0" : "1"); return !c; });
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const canSee = (i: NavItem) => (!i.perm || perms[i.perm]) && (!i.plan || reports);
  const primary = PRIMARY.filter(canSee);
  const management = MANAGEMENT.filter(canSee);

  const isActive = (i: NavItem): boolean => {
    const path = i.href.split("?")[0];
    if (i.exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + "/") || (!!i.soon && pathname.startsWith("/portal/soon"));
  };

  const Nav = ({ compact }: { compact: boolean }) => (
    <nav className="p-scroll flex-1 space-y-1 overflow-y-auto px-3 py-2">
      {primary.map((i) => <NavLink key={i.label} item={i} active={isActive(i)} compact={compact} />)}
      {management.length > 0 && (
        <>
          <div className={`px-2 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/30 ${compact ? "text-center" : ""}`}>
            {compact ? "•••" : "Management"}
          </div>
          {management.map((i) => <NavLink key={i.label} item={i} active={isActive(i)} compact={compact} />)}
        </>
      )}
      {showBilling && <NavLink item={BILLING} active={isActive(BILLING)} compact={compact} />}
    </nav>
  );

  const Footer = ({ compact }: { compact: boolean }) => (
    <div className="border-t border-white/8 p-3">
      {showUpgrade && !compact && (
        <div className="mb-3 rounded-2xl border border-brass/20 bg-gradient-to-b from-brass/10 to-transparent p-4 text-center">
          <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]"><Icon.spark className="h-5 w-5" /></span>
          <div className="mt-2 text-sm font-semibold text-cream">Upgrade your plan</div>
          <p className="mt-1 text-[11px] text-cream/50">Unlock reports, reviews & more.</p>
          <Link href="/pricing" className="p-btn-gold mt-3 w-full !py-2 text-xs">Upgrade Now</Link>
        </div>
      )}
      <Link href="/portal/account" className={`p-nav ${isActive({ label: "", href: "/portal/account", icon: "settings" }) ? "p-nav-active" : ""}`} title="Settings">
        <Icon.settings className="h-5 w-5 shrink-0" />{!compact && <span>Settings</span>}
      </Link>
      <form action={signOutAction}>
        <button className="p-nav w-full text-left" title="Log out"><Icon.logout className="h-5 w-5 shrink-0" />{!compact && <span>Log out</span>}</button>
      </form>
    </div>
  );

  const Brand = ({ compact }: { compact: boolean }) => (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 10V6a2 2 0 0 1 2-2h1M18 10V6a2 2 0 0 0-2-2h-1" /><rect x="5" y="10" width="14" height="6" rx="1.5" /><path d="M7 16v4M17 16v4M4 20h16" />
        </svg>
      </span>
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-display text-[15px] text-cream">{tenant.name}</span>
          <span className="block text-[9px] uppercase tracking-[0.2em] text-brass/70">The Chair</span>
        </span>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 78 : 250 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/8 bg-[#0c0b0e]/90 backdrop-blur md:flex"
      >
        <div className="relative">
          <Brand compact={collapsed} />
          <button onClick={toggleCollapse} aria-label="Collapse sidebar"
            className="absolute -right-3 top-5 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#141317] text-cream/60 transition hover:text-brass">
            <Icon.chevron className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <Nav compact={collapsed} />
        <Footer compact={collapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/10 bg-[#0c0b0e] md:hidden">
              <Brand compact={false} />
              <Nav compact={false} />
              <Footer compact={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/8 bg-[#0a090c]/80 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMobileOpen(true)} aria-label="Menu" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-cream md:hidden">
            <Icon.menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <span className="truncate font-display text-lg text-cream md:hidden">{tenant.name}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href={siteUrl} target="_blank" rel="noreferrer" className="hidden text-xs text-cream/50 hover:text-brass sm:inline">View shop site ↗</a>
            <div className="relative">
              <button onClick={() => setNotifOpen((o) => !o)} className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream/70 transition hover:text-brass" aria-label="Notifications">
                <Icon.bell className="h-5 w-5" />
                {notifs.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brass px-1 text-[10px] font-bold text-[#17130a]">{notifs.length}</span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="p-scroll absolute right-0 z-50 mt-2 max-h-[70vh] w-[340px] overflow-y-auto rounded-2xl border border-white/10 bg-[#131217] p-2 shadow-2xl">
                      <div className="px-3 py-2 text-sm font-semibold text-cream">Notifications</div>
                      {notifs.length === 0 ? (
                        <div className="px-3 pb-3 pt-1 text-sm text-cream/45">You&apos;re all caught up.</div>
                      ) : (
                        notifs.map((n) => <NotifCard key={n.id} n={n} onResolved={removeNotif} />)
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-white/10 py-1 pl-1 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-xs font-bold text-[#17130a]">{initials(user.name)}</span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-medium text-cream">{user.name}</span>
                <span className="flex items-center gap-1.5 text-[10px] text-cream/45">
                  {user.roleLabel}
                  <span className="rounded-full border border-brass/40 bg-brass/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-brass">{planLabel}</span>
                </span>
              </span>
            </div>
          </div>
        </header>

        {demo && (
          <div className="border-b border-brass/25 bg-brass/[0.07] px-5 py-2 text-center text-sm text-brass/90">
            🎬 Sample shop — explore and run the day freely. Changes to services, staff, branding &amp; website content aren&apos;t saved.
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ item, active, compact }: { item: NavItem; active: boolean; compact: boolean }) {
  const I = Icon[item.icon];
  return (
    <Link href={item.href} title={compact ? item.label : undefined} className={`p-nav ${active ? "p-nav-active" : ""} ${compact ? "justify-center" : ""}`}>
      <I className="h-5 w-5 shrink-0" />
      {!compact && (
        <span className="flex-1">{item.label}</span>
      )}
      {!compact && item.soon && <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cream/40">Soon</span>}
    </Link>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
}

function NotifCard({ n, onResolved }: { n: EditNotif; onResolved: (id: string) => void }) {
  const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-sm text-cream">
        <Icon.clock className="h-4 w-4 shrink-0 text-brass" />
        <span className="font-medium">{n.barberName}</span> suggested a timeclock edit
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-cream/60">
        {n.proposedIn && <div>In: <span className="text-cream/40 line-through">{t(n.currentIn)}</span> → <span className="text-brass">{t(n.proposedIn)}</span></div>}
        {n.proposedOut && <div>Out: <span className="text-cream/40 line-through">{t(n.currentOut)}</span> → <span className="text-brass">{t(n.proposedOut)}</span></div>}
        {n.reason && <div className="text-cream/50">“{n.reason}”</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <form action={approveTimeEdit.bind(null, n.id)} onSubmit={() => onResolved(n.id)} className="flex-1">
          <button className="w-full rounded-full border border-emerald-400/30 bg-emerald-400/10 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20">Approve</button>
        </form>
        <form action={rejectTimeEdit.bind(null, n.id)} onSubmit={() => onResolved(n.id)} className="flex-1">
          <button className="w-full rounded-full border border-white/12 py-1.5 text-xs text-cream/70 transition hover:border-red-400/40 hover:text-red-200">Reject</button>
        </form>
      </div>
    </div>
  );
}
