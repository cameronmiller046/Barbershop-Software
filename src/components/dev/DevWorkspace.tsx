"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BOARD_COLUMNS, columnOf, STATUS_ORDER, STATUS_META, TYPE_META, PRIORITY_ORDER, PRIORITY_META,
  SEVERITY_ORDER, SEVERITY_META, SUGGESTED_LABELS,
  type TicketStatus, type TicketPriority,
} from "@/lib/tickets";
import { setStatus, setPriority, assignTicket, setSeverity, setLabels, addAdminComment, createTicket, getTicketThread } from "@/app/dev/actions";

export type WsTicket = {
  id: string; ref: string; type: string; title: string; description: string; details: Record<string, string>;
  status: string; priority: string; severity: string | null; labels: string[];
  assigneeId: string | null; assigneeName: string | null; reporterName: string; reporterEmail: string; tenantName: string | null;
  comments: number; createdISO: string; updatedISO: string;
  diagnostics: { route: string | null; browser: string | null; os: string | null; screen: string | null; appVersion: string | null; consoleLogs: string | null };
};
type User = { id: string; name: string };
type Summary = { issues: number; completed: number; inProgress: number; blocked: number };

const VIEW_TABS = ["Board", "List", "Timeline", "Calendar", "Reports", "Milestones"];
const PRIORITY_RANK: Record<string, number> = Object.fromEntries(PRIORITY_ORDER.map((p, i) => [p, i]));

export function DevWorkspace({ tickets, assignees, summary, workload, trend, typeFilter, query }: {
  tickets: WsTicket[]; assignees: User[]; summary: Summary;
  workload: { name: string; count: number }[]; trend: { label: string; open: number; isToday: boolean }[];
  typeFilter: string | null; query: string;
}) {
  const router = useRouter();
  const [local, setLocal] = useState(tickets);
  useEffect(() => setLocal(tickets), [tickets]);

  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState(query);
  const [prio, setPrio] = useState("");
  const [asg, setAsg] = useState("");
  const [sort, setSort] = useState<"priority" | "newest">("priority");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const nav = (params: Record<string, string>) => {
    const p = new URLSearchParams();
    if (params.type ?? typeFilter) p.set("type", params.type ?? typeFilter ?? "");
    const query2 = params.q ?? q;
    if (query2) p.set("q", query2);
    router.push(`/dev${p.toString() ? `?${p}` : ""}`);
  };

  const filtered = useMemo(() => {
    let r = local;
    if (prio) r = r.filter((t) => t.priority === prio);
    if (asg) r = r.filter((t) => (asg === "__none" ? !t.assigneeId : t.assigneeId === asg));
    r = [...r].sort((a, b) => sort === "priority"
      ? PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
      : +new Date(b.createdISO) - +new Date(a.createdISO));
    return r;
  }, [local, prio, asg, sort]);

  const drop = async (colKey: string) => {
    setOver(null);
    const id = dragId; setDragId(null);
    if (!id) return;
    const col = BOARD_COLUMNS.find((c) => c.key === colKey)!;
    const cur = local.find((t) => t.id === id);
    if (!cur || columnOf(cur.status as TicketStatus) === colKey) return;
    setLocal((ts) => ts.map((t) => (t.id === id ? { ...t, status: col.drop } : t)));
    await setStatus(id, col.drop);
    router.refresh();
  };

  const sel = local.find((t) => t.id === selected) ?? null;

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-white/8 px-6 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-cream/40">
          <span>Development Center</span><span>›</span><span className="text-cream/70">Kanban Board</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-cream">Kanban Board</h1>
            <p className="text-sm text-cream/45">Track, prioritize, and ship exceptional features.</p>
          </div>
          <button onClick={() => setCreating(true)} className="p-btn-gold">+ Create issue</button>
        </div>
        <div className="mt-3 flex items-center gap-1 overflow-x-auto">
          {VIEW_TABS.map((t) => (
            <button key={t} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${t === "Board" ? "bg-brass/12 font-medium text-brass" : "text-cream/50 hover:bg-white/5 hover:text-cream"}`}>{t}</button>
          ))}
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/8 px-6 py-2.5">
        <form onSubmit={(e) => { e.preventDefault(); nav({ q }); }} className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search issues…" className="w-52 rounded-lg border border-white/10 bg-white/[0.02] py-1.5 pl-3 pr-3 text-sm text-cream placeholder:text-cream/30 focus:border-brass/60 focus:outline-none" />
        </form>
        <Dropdown label="Type" value={typeFilter ?? ""} onChange={(v) => nav({ type: v })} options={[{ v: "", l: "All" }, { v: "BUG", l: "Bug" }, { v: "FEATURE", l: "Feature" }, { v: "QUESTION", l: "Question" }]} />
        <Dropdown label="Priority" value={prio} onChange={setPrio} options={[{ v: "", l: "All" }, ...PRIORITY_ORDER.map((p) => ({ v: p, l: PRIORITY_META[p].label }))]} />
        <Dropdown label="Assignee" value={asg} onChange={setAsg} options={[{ v: "", l: "All" }, { v: "__none", l: "Unassigned" }, ...assignees.map((a) => ({ v: a.id, l: a.name }))]} />
        <span className="ml-auto" />
        <Dropdown label="Sort by" value={sort} onChange={(v) => setSort(v as "priority" | "newest")} options={[{ v: "priority", l: "Priority" }, { v: "newest", l: "Newest" }]} />
      </div>

      {/* Board */}
      <div className="p-scroll min-h-0 flex-1 overflow-auto px-6 py-4">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {BOARD_COLUMNS.map((col) => {
            const cards = filtered.filter((t) => columnOf(t.status as TicketStatus) === col.key);
            const overCap = col.wip != null && cards.length > col.wip;
            return (
              <div key={col.key} onDragOver={(e) => { e.preventDefault(); setOver(col.key); }} onDragLeave={() => setOver((o) => (o === col.key ? null : o))} onDrop={() => drop(col.key)}
                className={`flex w-[300px] shrink-0 flex-col rounded-2xl border p-2.5 transition ${over === col.key ? "border-brass/50 bg-brass/[0.04]" : "border-white/8 bg-white/[0.015]"}`}>
                <div className="mb-2 flex items-center justify-between px-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cream">{col.label}</span>
                    <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[11px] text-cream/60">{cards.length}</span>
                  </div>
                  <span className={`text-[11px] ${overCap ? "text-red-300" : "text-cream/30"}`}>{col.wip != null ? `WIP limit ${col.wip}` : "No limit"}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((t) => (
                    <Card key={t.id} t={t} onOpen={() => setSelected(t.id)} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} dragging={dragId === t.id} />
                  ))}
                  <button onClick={() => setCreating(true)} className="w-full rounded-xl border border-dashed border-white/8 py-2 text-xs text-cream/35 transition hover:border-brass/30 hover:text-cream/60">+ Create issue</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom widgets */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3" style={{ maxWidth: 1180 }}>
          <Widget title="This Cycle">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[["Issues", summary.issues], ["Done", summary.completed], ["Active", summary.inProgress], ["Blocked", summary.blocked]].map(([l, v]) => (
                <div key={l as string}><div className="font-display text-2xl font-semibold text-cream">{v as number}</div><div className="text-[11px] text-cream/45">{l as string}</div></div>
              ))}
            </div>
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#d8b25c] to-[#f6dd93]" style={{ width: `${summary.issues ? Math.round((summary.completed / summary.issues) * 100) : 0}%` }} /></div>
              <div className="mt-1 text-[11px] text-cream/45">{summary.issues ? Math.round((summary.completed / summary.issues) * 100) : 0}% complete</div>
            </div>
          </Widget>
          <Widget title="Burndown">
            <Burndown data={trend} />
          </Widget>
          <Widget title="Team Workload">
            {workload.length === 0 ? <p className="text-sm text-cream/40">No assigned open issues.</p> : (
              <div className="space-y-1.5">
                {workload.map((w) => {
                  const max = Math.max(...workload.map((x) => x.count), 1);
                  return (
                    <div key={w.name} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 truncate text-cream/70">{w.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-gradient-to-r from-[#b98a3c] to-[#f6dd93]" style={{ width: `${(w.count / max) * 100}%` }} /></div>
                      <span className="w-5 text-right text-cream/50">{w.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Widget>
        </div>
      </div>

      {/* Drawer + create */}
      <AnimatePresence>{sel && <Drawer key={sel.id} t={sel} assignees={assignees} onClose={() => setSelected(null)} onChanged={() => router.refresh()} />}</AnimatePresence>
      <AnimatePresence>{creating && <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); router.refresh(); }} />}</AnimatePresence>
    </div>
  );
}

/* ── Card ── */
function Card({ t, onOpen, onDragStart, onDragEnd, dragging }: { t: WsTicket; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void; dragging: boolean }) {
  const tm = TYPE_META[t.type as keyof typeof TYPE_META];
  const pm = PRIORITY_META[t.priority as TicketPriority];
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}
      className={`cursor-pointer rounded-xl border border-white/10 bg-[#151318] p-3 shadow-sm transition hover:border-brass/40 ${dragging ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between text-[11px] text-cream/40">
        <span className="font-mono">{t.ref}</span>
        <span className="opacity-0 transition group-hover:opacity-100">⋯</span>
      </div>
      <div className="mt-1 line-clamp-2 text-sm text-cream">{t.title}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${tm.color}22`, color: tm.color }}>{t.type === "FEATURE" ? "Feature" : t.type === "BUG" ? "Bug" : "Question"}</span>
        {t.labels.slice(0, 1).map((l) => <span key={l} className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-cream/55">{l}</span>)}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] text-cream/55">
          <Avatar name={t.assigneeName} />
          <span className="truncate">{t.assigneeName ?? "Unassigned"}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {t.comments > 0 && <span className="text-[11px] text-cream/35">💬 {t.comments}</span>}
          <PriorityArrow priority={t.priority} color={pm.color} />
        </span>
      </div>
    </div>
  );
}

function PriorityArrow({ priority, color }: { priority: string; color: string }) {
  const up = ["HIGH", "CRITICAL", "BLOCKER"].includes(priority);
  return <span title={PRIORITY_META[priority as TicketPriority].label} style={{ color }} className="text-xs font-bold">{up ? "↑" : priority === "MEDIUM" ? "=" : "↓"}</span>;
}
function Avatar({ name }: { name: string | null }) {
  if (!name) return <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-white/20 text-[9px] text-cream/40">?</span>;
  return <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[9px] font-bold text-[#17130a]">{name.slice(0, 1).toUpperCase()}</span>;
}

/* ── Drawer ── */
type Thread = { comments: { id: string; author: string; body: string; internal: boolean; at: string }[]; activity: { id: string; actor: string; detail: string; at: string }[] };
function Drawer({ t, assignees, onClose, onChanged }: { t: WsTicket; assignees: User[]; onClose: () => void; onChanged: () => void }) {
  const [, start] = useTransition();
  const [tab, setTab] = useState<"details" | "activity" | "comments">("details");
  const [thread, setThread] = useState<Thread | null>(null);
  const [labels, setLabelsLocal] = useState(t.labels);
  const [labelInput, setLabelInput] = useState("");
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); onChanged(); });

  useEffect(() => { setLabelsLocal(t.labels); }, [t.labels]);
  useEffect(() => { let live = true; getTicketThread(t.id).then((d) => { if (live) setThread(d); }); return () => { live = false; }; }, [t.id]);
  const refreshThread = () => getTicketThread(t.id).then(setThread);

  const tm = TYPE_META[t.type as keyof typeof TYPE_META];
  const addLabel = (l: string) => { const v = l.trim(); if (v && !labels.includes(v)) { const next = [...labels, v]; setLabelsLocal(next); run(() => setLabels(t.id, next)); } setLabelInput(""); };
  const rmLabel = (l: string) => { const next = labels.filter((x) => x !== l); setLabelsLocal(next); run(() => setLabels(t.id, next)); };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-black/40" />
      <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="p-scroll fixed right-0 top-0 z-[71] flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-white/10 bg-[#0f0e12]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#0f0e12]/95 px-5 py-3 backdrop-blur">
          <span className="flex items-center gap-2 text-xs text-cream/45"><span className="text-base">{tm.emoji}</span><span className="font-mono">{t.ref}</span></span>
          <button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button>
        </div>

        <div className="px-5 py-4">
          <h2 className="font-display text-xl text-cream">{t.title}</h2>

          {/* Property grid */}
          <div className="mt-4 space-y-2.5 text-sm">
            <PropRow label="Status">
              <MiniSelect value={t.status} onChange={(v) => run(() => setStatus(t.id, v))} options={STATUS_ORDER.map((s) => ({ v: s, l: STATUS_META[s].label }))} color={STATUS_META[t.status as TicketStatus].color} />
            </PropRow>
            <PropRow label="Priority">
              <MiniSelect value={t.priority} onChange={(v) => run(() => setPriority(t.id, v))} options={PRIORITY_ORDER.map((p) => ({ v: p, l: PRIORITY_META[p].label }))} color={PRIORITY_META[t.priority as TicketPriority].color} />
            </PropRow>
            {t.type === "BUG" && (
              <PropRow label="Severity">
                <MiniSelect value={t.severity ?? ""} onChange={(v) => run(() => setSeverity(t.id, v))} options={[{ v: "", l: "None" }, ...SEVERITY_ORDER.map((s) => ({ v: s, l: SEVERITY_META[s].label }))]} color={t.severity ? SEVERITY_META[t.severity as keyof typeof SEVERITY_META].color : "#94a3b8"} />
              </PropRow>
            )}
            <PropRow label="Type"><span className="rounded px-1.5 py-0.5 text-xs" style={{ background: `${tm.color}22`, color: tm.color }}>{tm.label}</span></PropRow>
            <PropRow label="Assignee">
              <MiniSelect value={t.assigneeId ?? ""} onChange={(v) => run(() => assignTicket(t.id, v))} options={[{ v: "", l: "Unassigned" }, ...assignees.map((a) => ({ v: a.id, l: a.name }))]} />
            </PropRow>
            <PropRow label="Reporter"><span className="text-cream/80">{t.reporterName}</span></PropRow>
            {t.tenantName && <PropRow label="Shop"><span className="text-cream/80">{t.tenantName}</span></PropRow>}
            <PropRow label="Labels">
              <div className="flex flex-wrap items-center justify-end gap-1">
                {labels.map((l) => <span key={l} className="flex items-center gap-1 rounded bg-brass/15 px-1.5 py-0.5 text-[11px] text-brass">{l}<button onClick={() => rmLabel(l)} className="text-brass/50 hover:text-brass">✕</button></span>)}
                <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(labelInput); } }} placeholder="+ label" list="dev-labels" className="w-16 rounded border border-white/10 bg-white/[0.02] px-1.5 py-0.5 text-[11px] text-cream focus:border-brass/50 focus:outline-none" />
                <datalist id="dev-labels">{SUGGESTED_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
              </div>
            </PropRow>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex gap-1 border-b border-white/8">
            {(["details", "activity", "comments"] as const).map((tb) => (
              <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-2 text-sm capitalize transition ${tab === tb ? "border-b-2 border-brass text-brass" : "text-cream/50 hover:text-cream"}`}>{tb}{tb === "comments" && thread ? ` ${thread.comments.length}` : ""}</button>
            ))}
          </div>

          {tab === "details" && (
            <div className="mt-4 space-y-4 text-sm">
              <div><div className="mb-1 text-[11px] uppercase tracking-wide text-cream/40">Description</div><p className="whitespace-pre-wrap text-cream/80">{t.description}</p></div>
              {Object.entries(t.details).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><div className="mb-1 text-[11px] uppercase tracking-wide text-cream/40">{DETAIL_LABEL[k] ?? k}</div><p className="whitespace-pre-wrap text-cream/80">{v}</p></div>
              ))}
              {(t.diagnostics.route || t.diagnostics.consoleLogs) && (
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wide text-cream/40">Diagnostics</div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-cream/55">
                    <span>Page: {t.diagnostics.route ?? "—"}</span><span>Browser: {t.diagnostics.browser ?? "—"}</span>
                    <span>OS: {t.diagnostics.os ?? "—"}</span><span>Screen: {t.diagnostics.screen ?? "—"}</span>
                  </div>
                  {t.diagnostics.consoleLogs && <pre className="p-scroll mt-2 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 text-[10px] text-cream/60">{t.diagnostics.consoleLogs}</pre>}
                </div>
              )}
              <div className="text-[11px] text-cream/35">Created {new Date(t.createdISO).toLocaleString()} · Updated {new Date(t.updatedISO).toLocaleString()}</div>
            </div>
          )}

          {tab === "activity" && (
            <ol className="mt-4 space-y-2.5">
              {!thread ? <li className="text-sm text-cream/40">Loading…</li> : thread.activity.map((a) => (
                <li key={a.id} className="flex gap-2.5 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass/70" /><div><span className="text-cream/80">{a.detail}</span> <span className="text-cream/40">— {a.actor}, {new Date(a.at).toLocaleString()}</span></div></li>
              ))}
            </ol>
          )}

          {tab === "comments" && (
            <div className="mt-4 space-y-3">
              {!thread ? <p className="text-sm text-cream/40">Loading…</p> : thread.comments.length === 0 ? <p className="text-sm text-cream/40">No comments yet.</p> : thread.comments.map((c) => (
                <div key={c.id} className={`rounded-xl border p-3 ${c.internal ? "border-amber-500/25 bg-amber-500/[0.05]" : "border-white/8 bg-white/[0.02]"}`}>
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-cream">{c.author}{c.internal && <span className="ml-1.5 rounded bg-amber-500/20 px-1 text-[10px] text-amber-200">Internal</span>}</span><span className="text-cream/40">{new Date(c.at).toLocaleString()}</span></div>
                  <p className="whitespace-pre-wrap text-sm text-cream/80">{c.body}</p>
                </div>
              ))}
              <div className="border-t border-white/8 pt-3">
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder={internal ? "Internal note…" : "Public response…"} className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none" />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-cream/60"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[#d8b25c]" /> Internal</label>
                  <button disabled={!comment.trim()} onClick={() => start(async () => { await addAdminComment(t.id, comment, internal); setComment(""); await refreshThread(); onChanged(); })} className="p-btn-gold disabled:opacity-50">Post</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

const DETAIL_LABEL: Record<string, string> = { steps: "Steps to reproduce", expected: "Expected behavior", actual: "Actual behavior", problem: "Problem being solved", solution: "Suggested solution", benefit: "Expected benefit", useCase: "Use case", category: "Category" };

/* ── Create modal ── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    const res = await createTicket({ type, title, description, priority });
    setBusy(false);
    if (res.ok) onCreated(); else setError(res.error);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#131217] p-6 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="font-display text-xl text-cream">Create issue</h3><button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button></div>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            {(["BUG", "FEATURE", "QUESTION"] as const).map((tp) => (
              <button key={tp} onClick={() => setType(tp)} className="flex-1 rounded-lg border px-3 py-2 text-sm transition" style={type === tp ? { borderColor: TYPE_META[tp].color, background: `${TYPE_META[tp].color}18`, color: TYPE_META[tp].color } : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(245,241,232,0.6)" }}>{TYPE_META[tp].emoji} {TYPE_META[tp].label}</button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" autoFocus className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Description" className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none" />
          <label className="block text-xs text-cream/50">Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none">
              {PRIORITY_ORDER.map((p) => <option key={p} value={p} className="bg-[#131217]">{PRIORITY_META[p].label}</option>)}
            </select>
          </label>
          {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="p-btn-ghost">Cancel</button><button disabled={busy || !title.trim()} onClick={submit} className="p-btn-gold disabled:opacity-50">{busy ? "Creating…" : "Create issue"}</button></div>
      </motion.div>
    </motion.div>
  );
}

/* ── small ── */
function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"><h3 className="mb-3 text-sm font-semibold text-cream">{title}</h3>{children}</div>;
}
function Dropdown({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.02] py-1.5 pl-3 pr-7 text-sm text-cream/80 transition hover:border-brass/40 focus:outline-none">
        {options.map((o) => <option key={o.v} value={o.v} className="bg-[#131217]">{label}: {o.l}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-cream/40">▾</span>
    </div>
  );
}
function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-cream/45">{label}</span><div className="min-w-0">{children}</div></div>;
}
function MiniSelect({ value, onChange, options, color }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; color?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs focus:border-brass/50 focus:outline-none" style={color ? { color } : undefined}>
      {options.map((o) => <option key={o.v} value={o.v} className="bg-[#131217] text-cream">{o.l}</option>)}
    </select>
  );
}
function Burndown({ data }: { data: { label: string; open: number; isToday: boolean }[] }) {
  const w = 300, h = 90, pad = 6;
  const max = Math.max(...data.map((d) => d.open), 1);
  const x = (i: number) => (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * (w - pad * 2) + pad);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.open).toFixed(1)}`).join(" ");
  const ideal = `M${x(0)},${y(data[0]?.open ?? 0)} L${x(data.length - 1)},${y(0)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <path d={ideal} fill="none" stroke="rgba(245,241,232,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={`${line} L${x(data.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} fill="url(#bd)" />
      <path d={line} fill="none" stroke="#d8b25c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <defs><linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d8b25c" stopOpacity="0.3" /><stop offset="100%" stopColor="#d8b25c" stopOpacity="0" /></linearGradient></defs>
    </svg>
  );
}
