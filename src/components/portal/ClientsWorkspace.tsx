"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { clientDetail, createClient, updateClient, saveClientNotes, redeemLoyaltyReward } from "@/app/portal/actions";
import type { ClientDetail, Appt, LoyaltyDetail } from "@/lib/clientDetail";
import { formatMoney } from "@/lib/utils";
import { Icon, type IconName } from "@/components/home/icons";
import { MessageComposer, type ComposerTemplate } from "@/components/portal/MessageComposer";

export type ClientRow = {
  id: string; name: string; phone: string | null; email: string | null; initials: string;
  visits: number; spentCents: number; lastVisitISO: string | null;
  isVip: boolean; isNew: boolean; isActive: boolean;
};
type Counts = { all: number; active: number; new: number; vip: number; inactive: number };
type Filter = "all" | "active" | "new" | "vip" | "inactive";
type SortKey = "name" | "visits" | "spent" | "last";
type Sort = { key: SortKey; dir: "asc" | "desc" };
type Tint = "brass" | "emerald" | "blue" | "purple" | "cyan";

// Shared column template so the table header and every row line up exactly.
const COLS = "grid-cols-[minmax(0,2.4fr)_minmax(0,2fr)_80px_120px_140px_110px_32px]";

export function ClientsWorkspace({
  rows, counts, initialDetail, templates = [], providers = { sms: false, email: false }, optedOutIds = [],
}: {
  rows: ClientRow[]; counts: Counts; initialDetail: ClientDetail | null;
  templates?: ComposerTemplate[]; providers?: { sms: boolean; email: boolean }; optedOutIds?: string[];
}) {
  const [composing, setComposing] = useState(false);
  const optedOut = useMemo(() => new Set(optedOutIds), [optedOutIds]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>({ key: "last", dir: "desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cache, setCache] = useState<Record<string, ClientDetail>>(initialDetail ? { [initialDetail.id]: initialDetail } : {});
  const [tab, setTab] = useState("overview");
  const [pending, startT] = useTransition();
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setMounted(true); }, []);

  const detail = selectedId ? cache[selectedId] ?? null : null;

  function select(id: string) {
    setSelectedId(id); setTab("overview"); setDrawerOpen(true);
    if (!cache[id]) startT(async () => { const d = await clientDetail(id); if (d) setCache((c) => ({ ...c, [id]: d })); });
  }
  const closeDrawer = () => setDrawerOpen(false);
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  // Close the drawer on Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const [redeeming, startRedeem] = useTransition();
  function redeem(id: string) {
    startRedeem(async () => {
      await redeemLoyaltyReward(id);
      const d = await clientDetail(id); // re-pull the fresh balance so the panel updates
      if (d) setCache((c) => ({ ...c, [id]: d }));
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const list = rows.filter((r) => {
      if (filter === "active" && !r.isActive) return false;
      if (filter === "inactive" && r.isActive) return false;
      if (filter === "new" && !r.isNew) return false;
      if (filter === "vip" && !r.isVip) return false;
      if (q) {
        const nameMatch = r.name.toLowerCase().includes(q);
        const phoneMatch = digits.length >= 3 && (r.phone || "").replace(/\D/g, "").includes(digits);
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      let cmp: number;
      if (sort.key === "name") cmp = a.name.localeCompare(b.name);
      else if (sort.key === "visits") cmp = a.visits - b.visits;
      else if (sort.key === "spent") cmp = a.spentCents - b.spentCents;
      else cmp = (a.lastVisitISO ? Date.parse(a.lastVisitISO) : 0) - (b.lastVisitISO ? Date.parse(b.lastVisitISO) : 0);
      return cmp * dir;
    });
  }, [rows, query, filter, sort]);

  // Paginate — default 10 per page, reset to page 1 when the result set changes.
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [query, filter, sort, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalValueCents = useMemo(() => rows.reduce((s, r) => s + r.spentCents, 0), [rows]);
  const activePct = counts.all ? Math.round((counts.active / counts.all) * 100) : 0;
  const KPIS: { label: string; value: string; icon: IconName; tint: Tint; sub: string }[] = [
    { label: "Total Clients", value: counts.all.toLocaleString(), icon: "customers", tint: "brass", sub: "All time" },
    { label: "VIP Clients", value: counts.vip.toLocaleString(), icon: "star", tint: "emerald", sub: "High-value regulars" },
    { label: "New Clients", value: counts.new.toLocaleString(), icon: "spark", tint: "blue", sub: "Recently joined" },
    { label: "Active Clients", value: counts.active.toLocaleString(), icon: "gauge", tint: "purple", sub: `${activePct}% of total` },
    { label: "Lifetime Value", value: formatMoney(totalValueCents), icon: "dollar", tint: "cyan", sub: "Total client spend" },
  ];

  // Export the current (filtered) list to CSV, client-side.
  function exportCsv() {
    const head = ["Name", "Phone", "Email", "Visits", "Total Spent", "Last Visit", "Status"];
    const body = filtered.map((r) => [
      r.name, r.phone ?? "", r.email ?? "", String(r.visits), (r.spentCents / 100).toFixed(2),
      r.lastVisitISO ? new Date(r.lastVisitISO).toISOString().slice(0, 10) : "",
      r.isActive ? "Active" : "Inactive",
    ]);
    const csv = [head, ...body].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const PILLS: { key: Filter; label: string; count: number; dot?: string }[] = [
    { key: "all", label: "All Clients", count: counts.all },
    { key: "active", label: "Active", count: counts.active, dot: "bg-emerald-400" },
    { key: "new", label: "New", count: counts.new, dot: "bg-blue-400" },
    { key: "vip", label: "VIP", count: counts.vip, dot: "gold" },
    { key: "inactive", label: "Inactive", count: counts.inactive, dot: "bg-red-400" },
  ];

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brass/25 bg-brass/[0.08] text-brass"><Icon.customers className="h-6 w-6" /></span>
          <div>
            <h1 className="font-display text-2xl text-cream sm:text-3xl">Clients</h1>
            <p className="mt-0.5 text-sm text-cream/55">Manage and grow your client relationships.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="p-btn-ghost"><DownloadIcon /> Export</button>
          <button onClick={() => setModal("add")} className="p-btn-gold"><Icon.plus className="h-4 w-4" /> Add Client</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Toolbar: search + segment filters */}
      <div className="mt-6 p-panel p-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/40"><SearchIcon /></span>
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients by name, phone, or email…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-3 pl-11 pr-4 text-cream outline-none transition focus:border-brass/50 focus:bg-white/[0.04] placeholder:text-cream/35" />
        </div>
        <div className="p-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
          {PILLS.map((p) => {
            const on = filter === p.key;
            return (
              <button key={p.key} onClick={() => setFilter(p.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-brass/60 bg-brass/12 text-brass" : "border-white/10 text-cream/65 hover:border-white/25 hover:text-cream"}`}>
                {p.dot === "gold" ? <Icon.star className="h-3.5 w-3.5" /> : p.dot ? <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} /> : <Icon.customers className="h-4 w-4" />}
                {p.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${on ? "bg-brass/20 text-brass" : "bg-white/8 text-cream/50"}`}>{p.count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 p-panel overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className={`grid ${COLS} items-center gap-4 border-b border-white/8 px-4 py-3`}>
              <SortTh label="Client" k="name" sort={sort} onSort={toggleSort} />
              <div className="text-xs font-medium uppercase tracking-wide text-cream/45">Contact</div>
              <SortTh label="Visits" k="visits" sort={sort} onSort={toggleSort} align="right" />
              <SortTh label="Total Spent" k="spent" sort={sort} onSort={toggleSort} align="right" />
              <SortTh label="Last Visit" k="last" sort={sort} onSort={toggleSort} />
              <div className="text-xs font-medium uppercase tracking-wide text-cream/45">Status</div>
              <div />
            </div>
            {filtered.length === 0 ? (
              <div className="px-4 py-16 text-center text-cream/50">No clients match your search.</div>
            ) : (
              <div className="divide-y divide-white/6">
                {pageRows.map((r) => <Row key={r.id} r={r} active={r.id === selectedId} onClick={() => select(r.id)} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: range + page size + pager */}
      {filtered.length > 0 && (
        <Footer page={safePage} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      )}

      {/* Detail drawer */}
      {mounted && createPortal(
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeDrawer} className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 340, damping: 36 }}
                className="p-scroll fixed right-0 top-0 z-[95] h-full w-full max-w-[470px] overflow-y-auto border-l border-white/10 bg-[#0b0a0d] p-4 shadow-2xl sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-cream/40">Client details</span>
                  <button onClick={closeDrawer} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-cream/60 transition hover:border-brass/40 hover:text-brass">✕</button>
                </div>
                {detail ? (
                  <Detail d={detail} tab={tab} setTab={setTab} pending={pending} onEdit={() => setModal("edit")} onRedeem={() => redeem(detail.id)} redeeming={redeeming} onMessage={() => setComposing(true)} />
                ) : (
                  <div className="p-panel h-[560px] animate-pulse" />
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {composing && detail && (
        <MessageComposer
          client={{ id: detail.id, name: detail.name, phone: detail.phone, email: detail.email, smsOptOut: optedOut.has(detail.id) }}
          templates={templates}
          providers={providers}
          onClose={() => setComposing(false)}
        />
      )}

      {modal === "add" && <ClientModal title="Add client" onClose={() => setModal(null)} action={createClient} />}
      {modal === "edit" && detail && <ClientModal title="Edit client" onClose={() => setModal(null)} action={updateClient.bind(null, detail.id)} defaults={{ name: detail.name, phone: detail.phone, email: detail.email }} />}
    </div>
  );
}

/* ── Table row ── */
function Row({ r, active, onClick }: { r: ClientRow; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`group grid ${COLS} w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-white/[0.03] ${active ? "bg-brass/[0.06]" : ""}`}>
      {/* Client */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar initials={r.initials} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-cream">{r.name}</span>
            {r.isVip && <VipBadge />}
            {r.isNew && <NewBadge />}
          </div>
        </div>
      </div>
      {/* Contact */}
      <div className="min-w-0">
        <div className="truncate text-sm text-cream/80">{r.phone || "—"}</div>
        <div className="truncate text-xs text-cream/40">{r.email || "No email"}</div>
      </div>
      {/* Visits */}
      <div className="text-right text-sm tabular-nums text-cream">{r.visits}</div>
      {/* Total spent */}
      <div className="text-right text-sm font-semibold tabular-nums text-brass">{formatMoney(r.spentCents)}</div>
      {/* Last visit */}
      <div className="text-sm text-cream/70">{relTime(r.lastVisitISO)}</div>
      {/* Status */}
      <div><StatusPill active={r.isActive} /></div>
      {/* chevron */}
      <Icon.chevron className={`h-4 w-4 justify-self-end rotate-180 ${active ? "text-brass" : "text-cream/25 group-hover:text-brass"}`} />
    </button>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/12 bg-white/[0.03] text-cream/50"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-cream/30"}`} />{active ? "Active" : "Inactive"}
    </span>
  );
}

function SortTh({ label, k, sort, onSort, align }: { label: string; k: SortKey; sort: Sort; onSort: (k: SortKey) => void; align?: "right" }) {
  const on = sort.key === k;
  return (
    <button onClick={() => onSort(k)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition hover:text-cream ${on ? "text-brass" : "text-cream/45"} ${align === "right" ? "justify-end" : ""}`}>
      {label}
      <Icon.chevron className={`h-3 w-3 transition ${on ? (sort.dir === "asc" ? "rotate-90" : "-rotate-90") : "-rotate-90 opacity-30"}`} />
    </button>
  );
}

const TINTS: Record<Tint, string> = {
  brass: "text-brass bg-brass/12 border-brass/25",
  emerald: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
  blue: "text-blue-300 bg-blue-500/10 border-blue-400/25",
  purple: "text-purple-300 bg-purple-500/10 border-purple-400/25",
  cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-400/25",
};

function KPICard({ label, value, icon, tint, sub }: { label: string; value: string; icon: IconName; tint: Tint; sub: string }) {
  const I = Icon[icon];
  return (
    <div className="p-panel p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${TINTS[tint]}`}><I className="h-5 w-5" /></span>
        <span className="text-xs text-cream/50">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tabular-nums text-cream">{value}</div>
      <div className="mt-1 text-xs text-cream/45">{sub}</div>
    </div>
  );
}

/* ── Footer: result range + page size + pager ── */
function Footer({ page, totalPages, total, pageSize, onPage, onPageSize }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void; onPageSize: (n: number) => void }) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-1">
      <div className="text-sm text-cream/50">Showing {start.toLocaleString()} to {end.toLocaleString()} of {total.toLocaleString()} results</div>
      <div className="flex items-center gap-3">
        <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page"
          className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-sm text-cream outline-none focus:border-brass/50">
          {[10, 25, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
        </select>
        <div className="flex items-center gap-1">
          <PgBtn disabled={page <= 1} onClick={() => onPage(page - 1)} label="Previous page"><Icon.chevron className="h-4 w-4" /></PgBtn>
          {pageWindow(page, totalPages).map((n, i) =>
            typeof n === "string" ? (
              <span key={`gap-${i}`} className="px-1.5 text-cream/30">…</span>
            ) : (
              <button key={n} onClick={() => onPage(n)}
                className={`grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm tabular-nums transition ${n === page ? "border-brass/60 bg-brass/12 text-brass" : "border-white/10 text-cream/65 hover:border-white/25 hover:text-cream"}`}>
                {n}
              </button>
            ),
          )}
          <PgBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)} label="Next page"><Icon.chevron className="h-4 w-4 rotate-180" /></PgBtn>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>;
}

function PgBtn({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-cream/70 transition hover:border-white/25 hover:text-cream disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/10">
      {children}
    </button>
  );
}

// Windowed page numbers: always show first + last, with the current page and its
// neighbours, collapsing the rest into "…".
function pageWindow(page: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | string)[] = [1];
  const left = Math.max(2, page - 1), right = Math.min(total - 1, page + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}

/* ── Detail panel ── */
function Detail({ d, tab, setTab, pending, onEdit, onRedeem, redeeming, onMessage }: { d: ClientDetail; tab: string; setTab: (t: string) => void; pending: boolean; onEdit: () => void; onRedeem: () => void; redeeming: boolean; onMessage: () => void }) {
  const TABS = ["Overview", "History", "Notes", "Appointments", "Photos"];
  return (
    <div className={`p-panel p-5 transition ${pending ? "opacity-60" : ""}`}>
      {/* header */}
      <div className="flex items-start gap-4">
        <Avatar initials={d.initials} big />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-cream">{d.name}</h2>
            {d.isVip && <VipBadge />}
            {d.isVip && <Icon.star className="h-4 w-4 text-brass" />}
          </div>
          {d.phone && <div className="mt-1 text-sm text-cream/70">{d.phone}</div>}
          {d.email && <div className="text-sm text-cream/70">{d.email}</div>}
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-emerald-300">
            <span className={`h-1.5 w-1.5 rounded-full ${d.isActive ? "bg-emerald-400" : "bg-cream/30"}`} />{d.isActive ? "Active Client" : "Inactive"}
          </div>
        </div>
        <button onClick={onEdit} aria-label="Edit client" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-cream/60 transition hover:border-brass/40 hover:text-brass"><Icon.settings className="h-4 w-4" /></button>
      </div>

      {/* stats */}
      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
        <Stat value={String(d.visits)} label="Total Visits" />
        <Stat value={formatMoney(d.spentCents)} label="Total Spent" border />
        <Stat value={fmtDate(d.memberSinceISO)} label="Member Since" border />
      </div>

      {d.loyalty && <LoyaltyCard l={d.loyalty} onRedeem={onRedeem} redeeming={redeeming} />}

      {/* tabs */}
      <div className="p-scroll mt-5 flex gap-4 overflow-x-auto border-b border-white/10">
        {TABS.map((t) => {
          const key = t.toLowerCase();
          const on = tab === key;
          return (
            <button key={t} onClick={() => setTab(key)} className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm transition ${on ? "border-brass text-brass" : "border-transparent text-cream/50 hover:text-cream"}`}>{t}</button>
          );
        })}
      </div>

      <div className="mt-5">
        {tab === "overview" && <Overview d={d} onAllNotes={() => setTab("notes")} />}
        {tab === "history" && <History appts={d.appointments} />}
        {tab === "notes" && <NotesTab d={d} />}
        {tab === "appointments" && <AppointmentsTab d={d} />}
        {tab === "photos" && <Empty icon="spark" text="No photos yet." />}
      </div>

      {/* bottom buttons */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/portal/appointments" className="p-btn-gold w-full"><Icon.calendar className="h-4 w-4" /> Book Appointment</Link>
        <button onClick={onMessage} disabled={!d.phone && !d.email} className="p-btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-40"><Icon.messages className="h-4 w-4" /> Message</button>
      </div>
    </div>
  );
}

function Overview({ d, onAllNotes }: { d: ClientDetail; onAllNotes: () => void }) {
  return (
    <div className="space-y-6">
      {d.favoriteServices.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-cream">Favorite Services</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.favoriteServices.map((s) => <span key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-cream/80">{s}</span>)}
          </div>
        </div>
      )}
      <div>
        <div className="text-sm font-semibold text-cream">Last Appointment</div>
        <div className="mt-3">{d.last ? <ApptCard a={d.last} /> : <EmptyLine text="No past appointments yet." />}</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-cream">Client Notes</div>
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          {d.notes ? (
            <>
              <p className="whitespace-pre-line text-sm leading-relaxed text-cream/75">{d.notes}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-cream/40">Updated {fmtDate(d.notesUpdatedISO)}</span>
                <button onClick={onAllNotes} aria-label="Edit notes" className="text-cream/40 transition hover:text-brass"><Icon.settings className="h-4 w-4" /></button>
              </div>
            </>
          ) : (
            <p className="text-sm text-cream/45">No notes yet — add preferences, allergies, or conversation notes.</p>
          )}
        </div>
        <button onClick={onAllNotes} className="mt-3 block w-full text-right text-sm font-medium text-brass hover:underline">View all notes</button>
      </div>
      <div>
        <div className="text-sm font-semibold text-cream">Upcoming Appointment</div>
        <div className="mt-3">{d.upcoming ? <ApptCard a={d.upcoming} /> : <EmptyLine text="No upcoming appointments." />}</div>
      </div>
    </div>
  );
}

function History({ appts }: { appts: Appt[] }) {
  const past = appts.filter((a) => a.status === "COMPLETED" || a.status === "CANCELLED" || a.status === "NO_SHOW");
  if (past.length === 0) return <EmptyLine text="No appointment history yet." />;
  return <div className="space-y-2">{past.map((a) => <ApptRow key={a.id} a={a} />)}</div>;
}

function AppointmentsTab({ d }: { d: ClientDetail }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-sm font-semibold text-cream">Upcoming</div>
        {d.upcoming ? <ApptCard a={d.upcoming} /> : <EmptyLine text="No upcoming appointments." />}
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-cream">All appointments</div>
        {d.appointments.length === 0 ? <EmptyLine text="None yet." /> : <div className="space-y-2">{d.appointments.map((a) => <ApptRow key={a.id} a={a} />)}</div>}
      </div>
    </div>
  );
}

function NotesTab({ d }: { d: ClientDetail }) {
  return (
    <form action={saveClientNotes.bind(null, d.id)}>
      <label className="text-sm font-semibold text-cream">Client notes</label>
      <textarea name="notes" defaultValue={d.notes ?? ""} rows={7} placeholder="Preferred style, allergies, conversation notes…" className="input mt-2 min-h-[160px]" />
      <div className="mt-3 flex justify-end"><button className="p-btn-gold">Save notes</button></div>
    </form>
  );
}

/* ── bits ── */
function ApptCard({ a }: { a: Appt }) {
  const s = statusBadge(a.status);
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brass/10 text-brass"><Icon.calendar className="h-5 w-5" /></span>
          <div>
            <div className="text-sm font-medium text-cream">{a.service}</div>
            <div className="text-xs text-cream/50">{fmtDate(a.dateISO)} · {fmtTime(a.dateISO)}</div>
            <div className="text-xs text-cream/50">{a.barber}</div>
          </div>
        </div>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>
      <Link href="/portal/appointments" className="mt-3 block text-right text-sm font-medium text-brass hover:underline">View Details</Link>
    </div>
  );
}

function ApptRow({ a }: { a: Appt }) {
  const s = statusBadge(a.status);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="min-w-0">
        <div className="truncate text-sm text-cream">{a.service} · <span className="text-cream/50">{a.barber}</span></div>
        <div className="text-xs text-cream/45">{fmtDate(a.dateISO)} · {fmtTime(a.dateISO)}</div>
      </div>
      <span className={`badge shrink-0 ${s.cls}`}>{s.label}</span>
    </div>
  );
}

function LoyaltyCard({ l, onRedeem, redeeming }: { l: LoyaltyDetail; onRedeem: () => void; redeeming: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(((l.threshold - l.toNext) / l.threshold) * 100)));
  return (
    <div className="mt-4 rounded-2xl border border-brass/25 bg-brass/[0.05] p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-brass"><Icon.star className="h-4 w-4" /> Loyalty</span>
        <span className="text-sm text-cream/70"><span className="font-display text-lg font-semibold text-cream">{l.points}</span> pts</span>
      </div>
      {l.rewardsAvailable > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm text-cream/85">{l.rewardsAvailable} reward{l.rewardsAvailable > 1 ? "s" : ""} ready · <span className="text-brass">{l.rewardLabel}</span></span>
          <button onClick={onRedeem} disabled={redeeming} className="p-btn-gold shrink-0 !px-3 !py-1.5 text-xs disabled:opacity-50">{redeeming ? "Redeeming…" : "Redeem"}</button>
        </div>
      ) : (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#f4d585] to-[#b98a3c]" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-cream/55">{l.toNext} more point{l.toNext > 1 ? "s" : ""} until a {l.rewardLabel.toLowerCase()}.</div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label, border }: { value: string; label: string; border?: boolean }) {
  return (
    <div className={`px-3 py-4 text-center ${border ? "border-l border-white/8" : ""}`}>
      <div className="font-display text-lg font-semibold text-cream">{value}</div>
      <div className="mt-0.5 text-[11px] text-cream/45">{label}</div>
    </div>
  );
}

function Avatar({ initials, big }: { initials: string; big?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brass/30 to-brass/5 font-semibold text-brass ring-1 ring-brass/30 ${big ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm"}`}>{initials}</span>
  );
}
function VipBadge() { return <span className="inline-flex items-center gap-1 rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-semibold text-brass"><Icon.star className="h-2.5 w-2.5" /> VIP</span>; }
function NewBadge() { return <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">New</span>; }
function EmptyLine({ text }: { text: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm text-cream/45">{text}</div>; }
function Empty({ text }: { icon: string; text: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-center text-sm text-cream/45">{text}</div>; }

function ClientModal({ title, onClose, action, defaults }: { title: string; onClose: () => void; action: (fd: FormData) => void | Promise<void>; defaults?: { name: string; phone: string | null; email: string | null } }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131217] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-display text-xl text-cream">{title}</h3><button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button></div>
        <form action={action} className="mt-4 space-y-3">
          <div><label className="label">Name</label><input name="name" required defaultValue={defaults?.name ?? ""} autoFocus className="input" /></div>
          <div><label className="label">Phone</label><input name="phone" defaultValue={defaults?.phone ?? ""} className="input" /></div>
          <div><label className="label">Email</label><input name="email" type="email" defaultValue={defaults?.email ?? ""} className="input" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="p-btn-ghost">Cancel</button>
            <button className="p-btn-gold">Save</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/* ── helpers ── */
function statusBadge(status: string): { label: string; cls: string } {
  switch (status) {
    case "COMPLETED": return { label: "Completed", cls: "st-completed" };
    case "CONFIRMED": return { label: "Scheduled", cls: "st-checkedin" };
    case "CANCELLED": return { label: "Cancelled", cls: "st-cancelled" };
    case "NO_SHOW": return { label: "No Show", cls: "st-noshow" };
    default: return { label: status, cls: "st-scheduled" };
  }
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
function relTime(iso: string | null) {
  if (!iso) return "No visits";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return `Today, ${fmtTime(iso)}`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return fmtDate(iso);
}

function SearchIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
