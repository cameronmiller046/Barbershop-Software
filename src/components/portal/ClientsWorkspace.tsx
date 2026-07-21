"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { clientDetail, createClient, updateClient, saveClientNotes, redeemLoyaltyReward } from "@/app/portal/actions";
import type { ClientDetail, Appt, LoyaltyDetail } from "@/lib/clientDetail";
import { formatMoney } from "@/lib/utils";
import { Icon } from "@/components/home/icons";

export type ClientRow = {
  id: string; name: string; phone: string | null; initials: string;
  visits: number; spentCents: number; lastVisitISO: string | null;
  isVip: boolean; isNew: boolean; isActive: boolean;
};
type Counts = { all: number; active: number; new: number; vip: number; inactive: number };
type Filter = "all" | "active" | "new" | "vip" | "inactive";

export function ClientsWorkspace({ rows, counts, initialDetail }: { rows: ClientRow[]; counts: Counts; initialDetail: ClientDetail | null }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"last" | "name" | "spent">("last");
  const [selectedId, setSelectedId] = useState<string | null>(initialDetail?.id ?? rows[0]?.id ?? null);
  const [cache, setCache] = useState<Record<string, ClientDetail>>(initialDetail ? { [initialDetail.id]: initialDetail } : {});
  const [tab, setTab] = useState("overview");
  const [pending, startT] = useTransition();
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const detail = selectedId ? cache[selectedId] ?? null : null;

  function select(id: string) {
    setSelectedId(id); setTab("overview");
    if (!cache[id]) startT(async () => { const d = await clientDetail(id); if (d) setCache((c) => ({ ...c, [id]: d })); });
  }

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
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "spent") return b.spentCents - a.spentCents;
      return (b.lastVisitISO ? Date.parse(b.lastVisitISO) : 0) - (a.lastVisitISO ? Date.parse(a.lastVisitISO) : 0);
    });
  }, [rows, query, filter, sort]);

  const PILLS: { key: Filter; label: string; count: number; dot?: string }[] = [
    { key: "all", label: "All Clients", count: counts.all },
    { key: "active", label: "Active", count: counts.active, dot: "bg-emerald-400" },
    { key: "new", label: "New", count: counts.new, dot: "bg-blue-400" },
    { key: "vip", label: "VIP", count: counts.vip, dot: "gold" },
    { key: "inactive", label: "Inactive", count: counts.inactive, dot: "bg-red-400" },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* Top row */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-cream">Clients</h1>
          <p className="mt-1 text-cream/55">Search and manage your clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => searchRef.current?.focus()} className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-cream/45 transition hover:border-brass/30 md:flex">
            <SearchIcon /> Search clients… <kbd className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-cream/40">⌘K</kbd>
          </button>
          <button onClick={() => setModal("add")} className="p-btn-gold"><Icon.plus className="h-4 w-4" /> Add Client</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.85fr_1fr]">
        {/* ── Center ── */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/40"><SearchIcon /></span>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients by name, phone, or email…"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.02] py-3.5 pl-11 pr-4 text-cream outline-none transition focus:border-brass/50 focus:bg-white/[0.04] placeholder:text-cream/35" />
            </div>
            <button className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl border border-brass/30 bg-brass/[0.06] text-brass transition hover:bg-brass/12" aria-label="Filters"><FilterIcon /></button>
          </div>

          {/* Filter pills */}
          <div className="p-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
            {PILLS.map((p) => {
              const on = filter === p.key;
              return (
                <button key={p.key} onClick={() => setFilter(p.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${on ? "border-brass/60 bg-brass/12 text-brass" : "border-white/10 text-cream/65 hover:border-white/25 hover:text-cream"}`}>
                  {p.dot === "gold" ? <Icon.star className="h-3.5 w-3.5" /> : p.dot ? <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} /> : <Icon.customers className="h-4 w-4" />}
                  {p.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${on ? "bg-brass/20 text-brass" : "bg-white/8 text-cream/50"}`}>{p.count.toLocaleString()}</span>
                </button>
              );
            })}
            <button className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-sm text-cream/65 transition hover:border-white/25 hover:text-cream">
              More Filters <Icon.chevron className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>

          {/* Count + sort */}
          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-cream/55">{filtered.length.toLocaleString()} clients found</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-cream/45">Sort by:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-cream outline-none focus:border-brass/50">
                <option value="last">Last Visit</option>
                <option value="name">Name</option>
                <option value="spent">Total Spent</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="mt-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="p-panel p-8 text-center text-cream/50">No clients match your search.</div>
            ) : (
              filtered.slice(0, 200).map((r) => <Row key={r.id} r={r} active={r.id === selectedId} onClick={() => select(r.id)} />)
            )}
            {filtered.length > 200 && <div className="py-3 text-center text-xs text-cream/40">Showing first 200 of {filtered.length.toLocaleString()} — refine your search.</div>}
          </div>
        </div>

        {/* ── Right detail ── */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          {detail ? (
            <Detail d={detail} tab={tab} setTab={setTab} pending={pending} onEdit={() => setModal("edit")} onRedeem={() => redeem(detail.id)} redeeming={redeeming} />
          ) : pending ? (
            <div className="p-panel h-[560px] animate-pulse" />
          ) : (
            <div className="p-panel flex h-[400px] flex-col items-center justify-center p-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/10 text-cream/30"><Icon.customers className="h-7 w-7" /></span>
              <div className="mt-4 text-cream/60">Select a client to see their details.</div>
            </div>
          )}
        </div>
      </div>

      {modal === "add" && <ClientModal title="Add client" onClose={() => setModal(null)} action={createClient} />}
      {modal === "edit" && detail && <ClientModal title="Edit client" onClose={() => setModal(null)} action={updateClient.bind(null, detail.id)} defaults={{ name: detail.name, phone: detail.phone, email: detail.email }} />}
    </div>
  );
}

/* ── List row ── */
function Row({ r, active, onClick }: { r: ClientRow; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${active ? "border-brass/50 bg-brass/[0.05]" : "border-white/8 bg-white/[0.02] hover:border-brass/40 hover:bg-white/[0.04]"}`}>
      <Avatar initials={r.initials} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-cream">{r.name}</span>
          {r.isVip && <VipBadge />}
          {r.isNew && <NewBadge />}
        </div>
        <div className="text-sm text-cream/45">{r.phone || "No phone"}</div>
      </div>
      <Col value={relTime(r.lastVisitISO)} label="Last visit" hide="sm" />
      <Col value={String(r.visits)} label="Total visits" hide="md" />
      <Col value={formatMoney(r.spentCents)} label="Total spent" gold hide="md" />
      <Icon.chevron className={`h-4 w-4 shrink-0 rotate-180 ${active ? "text-brass" : "text-cream/25 group-hover:text-brass"}`} />
    </button>
  );
}

function Col({ value, label, gold, hide }: { value: string; label: string; gold?: boolean; hide: "sm" | "md" }) {
  return (
    <div className={`w-24 shrink-0 text-right ${hide === "sm" ? "hidden sm:block" : "hidden md:block"}`}>
      <div className={`text-sm ${gold ? "font-semibold text-brass" : "text-cream"}`}>{value}</div>
      <div className="text-xs text-cream/40">{label}</div>
    </div>
  );
}

/* ── Detail panel ── */
function Detail({ d, tab, setTab, pending, onEdit, onRedeem, redeeming }: { d: ClientDetail; tab: string; setTab: (t: string) => void; pending: boolean; onEdit: () => void; onRedeem: () => void; redeeming: boolean }) {
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
        <a href={d.email ? `mailto:${d.email}` : d.phone ? `sms:${d.phone}` : "#"} className="p-btn-ghost w-full"><Icon.messages className="h-4 w-4" /> Message</a>
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
function FilterIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 5h18M6 12h12M10 19h4" /></svg>; }
