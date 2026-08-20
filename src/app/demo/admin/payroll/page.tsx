"use client";

// Payroll — computed live from the sandbox's punches, appointments, staff rates
// and the payroll settings in Store Settings. Hour corrections are day-based
// punch edits (clock-in / clock-out per shift), never "type a new total".

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, SectionTitle, SandboxNote, Modal, Btn, Field, Avatar, cx } from "@/components/demo/ui";
import { StatCard, Select, TableWrap, Th, Td, ProgressBar, StatusPill, downloadCsv, csvMoney, GOLD, GRAY_LT, GREEN } from "@/components/demo/finance";
import { Icon } from "@/components/home/icons";
import { formatMoney } from "@/lib/utils";
import type { DemoState, PayrollAdjustment, Staff, TimeEntry } from "@/lib/demo/types";

const DAY = 86_400_000;
const PERIOD_DAYS: Record<string, number> = { Weekly: 7, "Bi-weekly": 14, "Semi-monthly": 15, Monthly: 30 };

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const toHHMM = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const withHHMM = (iso: string, hhmm: string) => { const d = new Date(iso); const [h, m] = hhmm.split(":").map(Number); d.setHours(h, m, 0, 0); return d.toISOString(); };
const hoursOf = (e: TimeEntry) => (e.clockOutISO ? Math.max(0, (Date.parse(e.clockOutISO) - Date.parse(e.clockInISO)) / 3_600_000) : 0);
const h1 = (n: number) => n.toFixed(1);

type Row = {
  staff: Staff;
  entries: TimeEntry[];
  regular: number; overtime: number; hours: number;
  baseCents: number; commissionCents: number; tipsCents: number; adjCents: number; grossCents: number;
};

function buildPayroll(state: DemoState, from: number, to: number): Row[] {
  const s = state.settings;
  return state.staff.filter((x) => x.active && x.level !== "Owner").map((staff) => {
    const entries = state.timeEntries
      .filter((e) => e.staffId === staff.id && Date.parse(e.clockInISO) >= from && Date.parse(e.clockInISO) <= to)
      .sort((a, b) => b.clockInISO.localeCompare(a.clockInISO));
    // Overtime is judged per week inside the period, not on the period total.
    const byWeek = new Map<number, number>();
    for (const e of entries) {
      const wk = Math.floor((Date.parse(e.clockInISO) - from) / (7 * DAY));
      byWeek.set(wk, (byWeek.get(wk) ?? 0) + hoursOf(e));
    }
    let regular = 0, overtime = 0;
    for (const h of byWeek.values()) {
      overtime += Math.max(0, h - s.overtimeAfterHours);
      regular += Math.min(h, s.overtimeAfterHours);
    }
    const hours = regular + overtime;
    const baseCents = Math.round(regular * staff.hourlyCents + overtime * staff.hourlyCents * s.overtimeMultiplier);
    const done = state.appointments.filter((a) =>
      a.staffId === staff.id && a.status === "completed" &&
      Date.parse(a.startISO) >= from && Date.parse(a.startISO) <= to);
    const commissionCents = Math.round(done.reduce((sum, a) => sum + a.priceCents, 0) * (staff.commissionRate / 100));
    const tipsAll = done.reduce((sum, a) => sum + a.tipCents, 0);
    const tipsCents = s.tipPayout === "With payroll" ? tipsAll : 0;
    const adjCents = state.payrollAdjustments.filter((a) => a.staffId === staff.id).reduce((sum, a) => sum + a.amountCents, 0);
    return {
      staff, entries, regular, overtime, hours,
      baseCents, commissionCents, tipsCents, adjCents,
      grossCents: baseCents + commissionCents + tipsCents + adjCents,
    };
  });
}

export default function PayrollPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const s = state.settings;

  const [tab, setTab] = useState<"breakdown" | "timeclock" | "adjustments" | "history">("breakdown");
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [dayEditorStaff, setDayEditorStaff] = useState<string | null>(null);
  const [bulkEdit, setBulkEdit] = useState(false);
  const [tipEditStaff, setTipEditStaff] = useState<string | null>(null);
  const [addingAdj, setAddingAdj] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [adjReviewed, setAdjReviewed] = useState(false);

  const now = Date.now();
  const periodDays = PERIOD_DAYS[s.payFrequency] ?? 14;
  const from = now - periodDays * DAY;
  const periodLabel = `${fmtShort(new Date(from))} – ${fmtShort(new Date(now))}`;
  const payDate = new Date(now + 4 * DAY);

  const rows = useMemo(() => buildPayroll(state, from, now), [state, from, now]);
  const visible = rows.filter((r) =>
    (role === "all" || r.staff.level === role) &&
    (!q.trim() || r.staff.name.toLowerCase().includes(q.trim().toLowerCase())));

  const totals = rows.reduce((t, r) => ({
    hours: t.hours + r.hours, ot: t.ot + r.overtime, base: t.base + r.baseCents, comm: t.comm + r.commissionCents,
    tips: t.tips + r.tipsCents, adj: t.adj + r.adjCents, gross: t.gross + r.grossCents,
  }), { hours: 0, ot: 0, base: 0, comm: 0, tips: 0, adj: 0, gross: 0 });

  const periodEntries = useMemo(
    () => state.timeEntries.filter((e) => Date.parse(e.clockInISO) >= from).sort((a, b) => b.clockInISO.localeCompare(a.clockInISO)),
    [state.timeEntries, from]);
  const closedEntries = periodEntries.filter((e) => e.clockOutISO);
  const unapproved = closedEntries.filter((e) => !e.approved);
  const edited = closedEntries.filter((e) => e.edited);
  const unapprovedHours = unapproved.reduce((sum, e) => sum + hoursOf(e), 0);
  const staffName = (id: string) => state.staff.find((x) => x.id === id)?.name ?? "—";

  // Overlapping punches for one person = a genuine conflict worth flagging.
  const conflicts = useMemo(() => {
    const out: string[] = [];
    for (const st of state.staff) {
      const mine = closedEntries.filter((e) => e.staffId === st.id).sort((a, b) => a.clockInISO.localeCompare(b.clockInISO));
      for (let i = 1; i < mine.length; i++) {
        if (Date.parse(mine[i].clockInISO) < Date.parse(mine[i - 1].clockOutISO!)) out.push(st.name);
      }
    }
    return [...new Set(out)];
  }, [closedEntries, state.staff]);

  const otWatch = rows.filter((r) => r.overtime > 0);
  const alreadyRun = state.payrollRuns.some((r) => r.periodLabel === periodLabel);
  const breaks = closedEntries.length * 0.5; // unpaid 30-minute break per shift

  const checklist = [
    { label: "All time approved", done: unapproved.length === 0, detail: `${closedEntries.length - unapproved.length}/${closedEntries.length}` },
    { label: "No time conflicts", done: conflicts.length === 0, detail: conflicts.length ? conflicts.join(", ") : `${rows.length}/${rows.length}` },
    { label: "Adjustments reviewed", done: adjReviewed, detail: `${state.payrollAdjustments.length} on file` },
    { label: "Payroll previewed", done: previewed, detail: previewed ? "Done" : "—" },
  ];
  const checkPct = (checklist.filter((c) => c.done).length / checklist.length) * 100;

  const openTab = (t: typeof tab) => {
    setTab(t);
    if (t === "adjustments") setAdjReviewed(true);
  };

  const exportPayroll = () => {
    downloadCsv(`payroll-${periodLabel.replace(/\s/g, "")}.csv`, [
      ["Payroll", periodLabel, s.payFrequency],
      [],
      ["Employee", "Role", "Regular Hrs", "OT Hrs", "Base Wage", "Commission", "Tips", "Adjustments", "Gross Pay"],
      ...rows.map((r) => [r.staff.name, r.staff.level, h1(r.regular), h1(r.overtime),
        csvMoney(r.baseCents), csvMoney(r.commissionCents), csvMoney(r.tipsCents), csvMoney(r.adjCents), csvMoney(r.grossCents)]),
      ["TOTAL", "", h1(totals.hours - totals.ot), h1(totals.ot),
        csvMoney(totals.base), csvMoney(totals.comm), csvMoney(totals.tips), csvMoney(totals.adj), csvMoney(totals.gross)],
    ]);
    toast("Payroll exported as CSV", "success");
  };

  const doRun = () => {
    const paid = rows.filter((r) => r.grossCents > 0).length;
    actions.runPayroll({ periodLabel, ranISO: new Date().toISOString(), totalCents: totals.gross, employees: paid });
    setRunOpen(false);
    openTab("history");
    toast(`Payroll run — ${formatMoney(totals.gross)} across ${paid} employees (simulated)`, "success");
  };

  const editorRow = rows.find((r) => r.staff.id === dayEditorStaff) ?? null;
  const tipRow = rows.find((r) => r.staff.id === tipEditStaff) ?? null;
  const savePunch = (id: string, inISO: string, outISO: string) => {
    actions.updateTimeEntry(id, { clockInISO: inISO, clockOutISO: outISO, edited: true, approved: false, note: "Edited in payroll — needs re-approval" });
    toast("Punch corrected — entry needs re-approval", "success");
  };

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle={`Current pay period: ${periodLabel} · ${s.payFrequency}`}
        actions={
          <>
            <button onClick={exportPayroll} className="p-btn-ghost"><Icon.reports className="h-4 w-4" /> Export</button>
            <button onClick={() => { setPreviewOpen(true); setPreviewed(true); }} className="p-btn-ghost">Preview Payroll</button>
            <button onClick={() => setRunOpen(true)} disabled={alreadyRun}
              className="p-btn-gold disabled:cursor-not-allowed disabled:opacity-40">
              {alreadyRun ? "✓ Payroll Run" : "Run Payroll"}
            </button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-cream/60">
          Pay date: <span className="text-cream">{fmtShort(payDate)}</span> (in 4 days)
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-cream/60">
          Tips <span className="text-cream">{s.tipPayout.toLowerCase()}</span> · OT after <span className="text-cream">{s.overtimeAfterHours}h/wk</span> at <span className="text-cream">{s.overtimeMultiplier}×</span>
        </span>
      </div>
      <SandboxNote>Payroll computes live from punches, bookings and your payroll settings. Runs and edits are simulated and reset on refresh.</SandboxNote>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Payroll Cost" value={formatMoney(totals.gross)} icon="dollar" delta={-6.4} invert />
        <StatCard label="Total Hours" value={h1(totals.hours)} icon="clock" delta={3.2} />
        <StatCard label="Commission Paid" value={formatMoney(totals.comm)} icon="growth" delta={1.5} />
        <StatCard label="Employees Paid" value={String(rows.filter((r) => r.grossCents > 0).length)} icon="staff"
          sub={`${rows.filter((r) => r.staff.level === "Barber").length} barbers · ${rows.filter((r) => r.staff.level === "Manager").length} manager`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-white/10">
              {([["breakdown", "Pay Period Breakdown"], ["timeclock", "Time Clock"], ["adjustments", "Adjustments"], ["history", "Pay History"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => openTab(key)}
                  className={cx("-mb-px border-b-2 pb-2.5 text-sm transition", tab === key ? "border-brass text-brass" : "border-transparent text-cream/50 hover:text-cream")}>
                  {label}
                </button>
              ))}
              {tab === "breakdown" && (
                <div className="ml-auto flex flex-wrap items-center gap-2 pb-2">
                  <Select value={role} onChange={setRole} options={[{ id: "all", label: "All Roles" }, { id: "Barber", label: "Barbers" }, { id: "Manager", label: "Managers" }]} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employee…" className="input w-40 !py-1.5 text-xs" />
                </div>
              )}
            </div>

            {tab === "breakdown" && (
              <>
                <TableWrap min={880}>
                  <thead>
                    <tr>
                      <Th>Employee</Th><Th>Status</Th><Th right>Hours</Th><Th right>Base Wage</Th>
                      <Th right>Commission</Th><Th right>Tips</Th><Th right>Other Adj.</Th><Th right>Gross Pay</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visible.map((r) => {
                      const pending = r.entries.filter((e) => e.clockOutISO && !e.approved).length;
                      return (
                        <tr key={r.staff.id} className="transition hover:bg-white/[0.02]">
                          <Td>
                            <span className="flex items-center gap-2.5">
                              <Avatar name={r.staff.name} color={r.staff.color} size={30} />
                              <span className="min-w-0">
                                <span className="block truncate text-cream/90">{r.staff.name}</span>
                                <span className="block text-[11px] text-cream/40">{r.staff.level} · {r.staff.commissionRate}% comm</span>
                              </span>
                            </span>
                          </Td>
                          <Td>{pending > 0
                            ? <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-200">{pending} pending</span>
                            : <StatusPill status="Paid" />}</Td>
                          <Td right>
                            <button onClick={() => setDayEditorStaff(r.staff.id)} title="Review and correct this employee's shifts"
                              className="group inline-flex items-center gap-1.5 text-cream/85 transition hover:text-brass">
                              <span className="tabular-nums">{h1(r.hours)}</span>
                              {r.overtime > 0 && <span className="text-[10px] text-brass">+{h1(r.overtime)} OT</span>}
                              <Icon.settings className="h-3.5 w-3.5 text-cream/30 transition group-hover:text-brass" />
                            </button>
                          </Td>
                          <Td right><span className="text-cream/85">{formatMoney(r.baseCents)}</span></Td>
                          <Td right><span className="text-cream/85">{formatMoney(r.commissionCents)}</span></Td>
                          <Td right>
                            <button onClick={() => setTipEditStaff(r.staff.id)} title="Record a tip correction"
                              className="group inline-flex items-center gap-1.5 text-cream/85 transition hover:text-brass">
                              {formatMoney(r.tipsCents)}
                              <Icon.settings className="h-3.5 w-3.5 text-cream/30 transition group-hover:text-brass" />
                            </button>
                          </Td>
                          <Td right><span className={r.adjCents < 0 ? "text-red-300" : r.adjCents > 0 ? "text-emerald-300" : "text-cream/50"}>{formatMoney(r.adjCents)}</span></Td>
                          <Td right><span className="font-semibold text-brass">{formatMoney(r.grossCents)}</span></Td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10">
                      <Td className="pt-3 font-semibold text-cream">TOTAL</Td><Td><span /></Td>
                      <Td right><span className="pt-3 font-semibold tabular-nums text-cream">{h1(totals.hours)}</span></Td>
                      <Td right><span className="font-semibold text-cream">{formatMoney(totals.base)}</span></Td>
                      <Td right><span className="font-semibold text-cream">{formatMoney(totals.comm)}</span></Td>
                      <Td right><span className="font-semibold text-cream">{formatMoney(totals.tips)}</span></Td>
                      <Td right><span className="font-semibold text-cream">{formatMoney(totals.adj)}</span></Td>
                      <Td right><span className="text-base font-semibold text-brass">{formatMoney(totals.gross)}</span></Td>
                    </tr>
                  </tfoot>
                </TableWrap>
                <p className="mt-2 text-[11px] text-cream/40">
                  Hours come from approved punches — click a total to correct a specific day.
                  {s.tipPayout === "Same day" && " Tips pay out same-day (Store Settings), so they're excluded from gross."}
                </p>
              </>
            )}

            {tab === "timeclock" && (
              <TableWrap min={720}>
                <thead>
                  <tr><Th>Day</Th><Th>Employee</Th><Th>Clock In</Th><Th>Clock Out</Th><Th right>Hours</Th><Th>Status</Th><Th right>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {periodEntries.map((e) => (
                    <tr key={e.id} className="transition hover:bg-white/[0.02]">
                      <Td className="whitespace-nowrap text-cream/70">{fmtDay(e.clockInISO)}</Td>
                      <Td className="text-cream/85">{staffName(e.staffId)}</Td>
                      <Td className="text-cream/60">{fmtTime(e.clockInISO)}</Td>
                      <Td className="text-cream/60">{e.clockOutISO ? fmtTime(e.clockOutISO) : <span className="text-emerald-300">On the clock</span>}</Td>
                      <Td right><span className="tabular-nums text-cream/70">{e.clockOutISO ? h1(hoursOf(e)) : "—"}</span></Td>
                      <Td>
                        <span className="flex items-center gap-1.5">
                          {e.clockOutISO
                            ? e.approved
                              ? <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200">Approved</span>
                              : <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[11px] text-sky-200">Pending</span>
                            : <span className="text-[11px] text-cream/40">Open shift</span>}
                          {e.edited && <span title={e.note} className="rounded-full border border-brass/40 bg-brass/10 px-1.5 py-0.5 text-[10px] text-brass">Edited</span>}
                        </span>
                      </Td>
                      <Td right>
                        <span className="inline-flex gap-2">
                          {e.clockOutISO && !e.approved && (
                            <button onClick={() => { actions.updateTimeEntry(e.id, { approved: true }); toast(`Approved ${staffName(e.staffId)} · ${fmtDay(e.clockInISO)}`, "success"); }}
                              className="text-xs font-semibold text-emerald-300 hover:underline">Approve</button>
                          )}
                          {e.clockOutISO && (
                            <button onClick={() => setDayEditorStaff(e.staffId)} className="text-xs font-semibold text-brass hover:underline">Edit</button>
                          )}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}

            {tab === "adjustments" && (
              <>
                <div className="mb-3 flex justify-end">
                  <Btn variant="gold" onClick={() => setAddingAdj(true)}><Icon.plus className="h-4 w-4" /> Add Adjustment</Btn>
                </div>
                {state.payrollAdjustments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-cream/40">No adjustments this period.</p>
                ) : (
                  <TableWrap min={560}>
                    <thead><tr><Th>Employee</Th><Th>Type</Th><Th>Reason</Th><Th right>Amount</Th><Th right>Actions</Th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {state.payrollAdjustments.map((a) => (
                        <tr key={a.id}>
                          <Td className="text-cream/85">{staffName(a.staffId)}</Td>
                          <Td className="text-cream/60">{a.kind}</Td>
                          <Td className="text-cream/60">{a.label}</Td>
                          <Td right><span className={a.amountCents < 0 ? "text-red-300" : "text-emerald-300"}>{formatMoney(a.amountCents)}</span></Td>
                          <Td right>
                            <button onClick={() => { actions.deletePayrollAdjustment(a.id); toast("Adjustment removed", "success"); }}
                              className="text-xs font-semibold text-red-300/80 hover:underline">Remove</button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                )}
              </>
            )}

            {tab === "history" && (
              state.payrollRuns.length === 0 ? <p className="py-8 text-center text-sm text-cream/40">No payroll runs yet.</p> : (
                <TableWrap min={480}>
                  <thead><tr><Th>Period</Th><Th>Ran</Th><Th right>Employees</Th><Th right>Total</Th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {state.payrollRuns.map((r) => (
                      <tr key={r.id}>
                        <Td className="text-cream/85">{r.periodLabel}</Td>
                        <Td className="text-cream/60">{fmtDay(r.ranISO)}</Td>
                        <Td right><span className="text-cream/60">{r.employees}</span></Td>
                        <Td right><span className="font-semibold text-brass">{formatMoney(r.totalCents)}</span></Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel>
              <SectionTitle>Time Clock Summary</SectionTitle>
              <HoursDonut segments={[
                { label: "Regular Hours", value: totals.hours - totals.ot, color: GREEN },
                { label: "Overtime Hours", value: totals.ot, color: GOLD },
                { label: "Unpaid Breaks", value: breaks, color: GRAY_LT },
              ]} />
              <button onClick={() => openTab("timeclock")} className="p-btn-ghost mt-4 w-full justify-center text-xs">
                <Icon.clock className="h-4 w-4" /> View Time Clock
              </button>
            </Panel>

            <Panel>
              <SectionTitle>Time Clock Alerts</SectionTitle>
              <ul className="space-y-2.5">
                {unapproved.length > 0 && (
                  <Alert tone="red"
                    text={`${new Set(unapproved.map((e) => e.staffId)).size} employee${new Set(unapproved.map((e) => e.staffId)).size === 1 ? "" : "s"} with unapproved time`}
                    sub={`${h1(unapprovedHours)} hours need approval`} action="Review" onAction={() => openTab("timeclock")} />
                )}
                {edited.length > 0 && (
                  <Alert tone="gold" text={`${edited.length} time entr${edited.length === 1 ? "y" : "ies"} edited`}
                    sub="Review changes before running payroll" action="Review" onAction={() => openTab("timeclock")} />
                )}
                {otWatch.map((r) => (
                  <Alert key={r.staff.id} tone="blue" text="Overtime accrued"
                    sub={`${r.staff.name} is at ${h1(r.hours)} hours (+${h1(r.overtime)} OT)`}
                    action="View" onAction={() => setDayEditorStaff(r.staff.id)} />
                ))}
                {conflicts.length > 0 && (
                  <Alert tone="red" text="Overlapping punches" sub={conflicts.join(", ")} action="Review" onAction={() => openTab("timeclock")} />
                )}
                {!unapproved.length && !edited.length && !otWatch.length && !conflicts.length && (
                  <li className="py-6 text-center text-sm text-cream/40">All clear — nothing needs attention.</li>
                )}
              </ul>
            </Panel>

            <Panel>
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <QuickAction icon="check" title="Approve All Time" sub="Approve all pending entries"
                  onClick={() => {
                    if (!unapproved.length) { toast("Nothing pending — all time is approved", "info"); return; }
                    actions.approveAllTime();
                    toast(`Approved ${unapproved.length} pending entr${unapproved.length === 1 ? "y" : "ies"}`, "success");
                  }} />
                <QuickAction icon="clock" title="Bulk Time Edit" sub="Fix punches day by day" onClick={() => setBulkEdit(true)} />
                <QuickAction icon="dollar" title="Add Adjustment" sub="Bonus, deduction, or other pay" onClick={() => setAddingAdj(true)} />
                <QuickAction icon="plus" title="Add Time Entry" sub="Record a missed shift" onClick={() => setAddingEntry(true)} />
              </div>
            </Panel>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel>
            <SectionTitle>Pay Period Details</SectionTitle>
            <dl className="divide-y divide-white/5 text-sm">
              {([["Pay Period", periodLabel], ["Pay Date", fmtShort(payDate)], ["Pay Frequency", s.payFrequency],
                ["Pay Type", "Commission + Hourly"], ["Employees", String(rows.length)]] as const).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-cream/50">{k}</dt><dd className="text-right text-cream/85">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 space-y-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs">
              {([["Base Wages", totals.base], ["Commission", totals.comm], ["Tips Paid Out", totals.tips], ["Other Adjustments", totals.adj]] as const).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between"><span className="text-cream/50">{k}</span><span className="text-cream/85">{formatMoney(v)}</span></div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Payroll Checklist</SectionTitle>
            <ul className="space-y-2.5">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5 text-sm">
                  <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full", c.done ? "bg-emerald-400/15 text-emerald-300" : "border border-white/15 text-transparent")}>
                    <Icon.check className="h-3 w-3" />
                  </span>
                  <span className={cx("min-w-0 flex-1 truncate", c.done ? "text-cream/80" : "text-cream/50")}>{c.label}</span>
                  <span className="shrink-0 text-xs text-cream/40">{c.detail}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1"><ProgressBar pct={checkPct} tone={checkPct === 100 ? "green" : "gold"} /></div>
              <span className="text-xs text-cream/45">{Math.round(checkPct)}%</span>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Notes</SectionTitle>
            <textarea className="input min-h-[110px] resize-y text-[13px]" placeholder="Add notes for this pay period…"
              value={state.payrollNotes} onChange={(e) => actions.setPayrollNotes(e.target.value)} />
          </Panel>
        </div>
      </div>

      {editorRow && <DayEditor row={editorRow} onClose={() => setDayEditorStaff(null)} onSave={savePunch} />}
      {bulkEdit && <BulkTimeEdit entries={closedEntries} staffName={staffName} onClose={() => setBulkEdit(false)} onSave={savePunch} />}
      {tipRow && (
        <TipCorrection row={tipRow} onClose={() => setTipEditStaff(null)}
          onSave={(amountCents, reason) => {
            actions.addPayrollAdjustment({ staffId: tipRow.staff.id, kind: "Tip correction", label: reason || "Tip correction", amountCents, dateISO: new Date().toISOString() });
            setTipEditStaff(null);
            toast(`Tip correction recorded for ${tipRow.staff.name}`, "success");
          }} />
      )}
      {addingAdj && (
        <AdjustmentModal staff={rows.map((r) => r.staff)} onClose={() => setAddingAdj(false)}
          onSave={(a) => { actions.addPayrollAdjustment(a); setAddingAdj(false); setAdjReviewed(true); toast(`${a.kind} recorded for ${staffName(a.staffId)}`, "success"); }} />
      )}
      {addingEntry && (
        <AddEntryModal staff={rows.map((r) => r.staff)} onClose={() => setAddingEntry(false)}
          onSave={(e) => { actions.addTimeEntry(e); setAddingEntry(false); toast(`Time entry added for ${staffName(e.staffId)}`, "success"); }} />
      )}
      {previewOpen && (
        <Modal open onClose={() => setPreviewOpen(false)} wide title={`Payroll preview — ${periodLabel}`}
          footer={<><Btn onClick={() => setPreviewOpen(false)}>Close</Btn>
            <Btn variant="gold" onClick={() => { setPreviewOpen(false); setRunOpen(true); }} disabled={alreadyRun}>Run Payroll</Btn></>}>
          <TableWrap min={560}>
            <thead><tr><Th>Employee</Th><Th right>Hours</Th><Th right>Base</Th><Th right>Comm.</Th><Th right>Tips</Th><Th right>Adj.</Th><Th right>Gross</Th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.staff.id}>
                  <Td className="text-cream/85">{r.staff.name}</Td>
                  <Td right><span className="tabular-nums text-cream/60">{h1(r.hours)}</span></Td>
                  <Td right><span className="text-cream/60">{formatMoney(r.baseCents)}</span></Td>
                  <Td right><span className="text-cream/60">{formatMoney(r.commissionCents)}</span></Td>
                  <Td right><span className="text-cream/60">{formatMoney(r.tipsCents)}</span></Td>
                  <Td right><span className="text-cream/60">{formatMoney(r.adjCents)}</span></Td>
                  <Td right><span className="font-semibold text-brass">{formatMoney(r.grossCents)}</span></Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10">
                <Td className="pt-2.5 font-semibold text-cream">Total</Td><Td><span /></Td><Td><span /></Td><Td><span /></Td><Td><span /></Td><Td><span /></Td>
                <Td right><span className="pt-2.5 font-semibold text-brass">{formatMoney(totals.gross)}</span></Td>
              </tr>
            </tfoot>
          </TableWrap>
        </Modal>
      )}
      {runOpen && (
        <Modal open onClose={() => setRunOpen(false)} title="Run payroll?"
          footer={<><Btn onClick={() => setRunOpen(false)}>Cancel</Btn><Btn variant="gold" onClick={doRun}>Confirm — Run Payroll</Btn></>}>
          <div className="space-y-3">
            <p className="text-sm text-cream/70">
              This finalizes <span className="font-semibold text-brass">{formatMoney(totals.gross)}</span> for{" "}
              {rows.filter((r) => r.grossCents > 0).length} employees, period {periodLabel}.
            </p>
            {unapproved.length > 0 && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-xs text-red-200">
                {unapproved.length} time entr{unapproved.length === 1 ? "y is" : "ies are"} still unapproved — approve them first, or they pay out as recorded.
              </p>
            )}
            <p className="text-[11px] text-cream/40">Sandbox only — the run lands in Pay History and resets on refresh.</p>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Day-based punch editor: one employee, every shift in the period ── */
function DayEditor({ row, onClose, onSave }: {
  row: Row; onClose: () => void; onSave: (id: string, inISO: string, outISO: string) => void;
}) {
  const closed = row.entries.filter((e) => e.clockOutISO);
  return (
    <Modal open onClose={onClose} wide title={`${row.staff.name} — time entries`}
      footer={<Btn variant="gold" onClick={onClose}>Done</Btn>}>
      <p className="mb-3 text-xs text-cream/45">
        {closed.length} shift{closed.length === 1 ? "" : "s"} this period · {h1(row.hours)} hours
        {row.overtime > 0 ? ` (${h1(row.overtime)} overtime)` : ""}. Corrections are per shift — an edited entry needs re-approval.
      </p>
      <div className="space-y-2">
        {closed.map((e) => <EntryEditor key={e.id} e={e} onSave={onSave} />)}
        {closed.length === 0 && <p className="py-6 text-center text-sm text-cream/40">No completed shifts this period.</p>}
      </div>
    </Modal>
  );
}

/** One shift: day label, in/out time inputs, live hours, save. */
function EntryEditor({ e, onSave, showName, name }: {
  e: TimeEntry; onSave: (id: string, inISO: string, outISO: string) => void; showName?: boolean; name?: string;
}) {
  const [inT, setInT] = useState(toHHMM(e.clockInISO));
  const [outT, setOutT] = useState(toHHMM(e.clockOutISO!));
  const changed = inT !== toHHMM(e.clockInISO) || outT !== toHHMM(e.clockOutISO!);
  const newIn = withHHMM(e.clockInISO, inT);
  const newOut = withHHMM(e.clockOutISO!, outT);
  const valid = Date.parse(newOut) > Date.parse(newIn);
  const hrs = valid ? (Date.parse(newOut) - Date.parse(newIn)) / 3_600_000 : 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
      <span className="w-32 shrink-0 text-sm text-cream/80">{fmtDay(e.clockInISO)}</span>
      {showName && <span className="w-28 shrink-0 truncate text-sm text-cream/60">{name}</span>}
      <input type="time" value={inT} onChange={(ev) => setInT(ev.target.value)} aria-label="Clock in"
        className="rounded-lg border border-white/10 bg-smoke px-2 py-1 text-sm text-cream" />
      <span className="text-cream/40">–</span>
      <input type="time" value={outT} onChange={(ev) => setOutT(ev.target.value)} aria-label="Clock out"
        className="rounded-lg border border-white/10 bg-smoke px-2 py-1 text-sm text-cream" />
      <span className={cx("w-14 text-right text-sm tabular-nums", valid ? "text-cream/60" : "text-red-300")}>
        {valid ? `${h1(hrs)}h` : "invalid"}
      </span>
      <span className="flex items-center gap-1.5">
        {e.edited && <span className="rounded-full border border-brass/40 bg-brass/10 px-1.5 py-0.5 text-[10px] text-brass">Edited</span>}
        {!e.approved && <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-200">Pending</span>}
      </span>
      <button disabled={!changed || !valid} onClick={() => onSave(e.id, newIn, newOut)}
        className="ml-auto rounded-full border border-brass/40 px-3 py-1 text-xs font-semibold text-brass transition hover:bg-brass/10 disabled:opacity-30">
        Save
      </button>
    </div>
  );
}

/** Bulk edit: pick a day, correct everyone's punches for that day. */
function BulkTimeEdit({ entries, staffName, onClose, onSave }: {
  entries: TimeEntry[]; staffName: (id: string) => string; onClose: () => void;
  onSave: (id: string, inISO: string, outISO: string) => void;
}) {
  const days = [...new Set(entries.map((e) => e.clockInISO.slice(0, 10)))].sort().reverse();
  const [day, setDay] = useState(days[0] ?? "");
  const dayEntries = entries.filter((e) => e.clockInISO.slice(0, 10) === day);
  return (
    <Modal open onClose={onClose} wide title="Bulk time edit"
      footer={<Btn variant="gold" onClick={onClose}>Done</Btn>}>
      <Field label="Day" hint="Correct every punch recorded on this day">
        <select className="input" value={day} onChange={(e) => setDay(e.target.value)}>
          {days.map((d) => <option key={d} value={d}>{fmtDay(`${d}T12:00:00`)}</option>)}
        </select>
      </Field>
      <div className="mt-3 space-y-2">
        {dayEntries.map((e) => <EntryEditor key={e.id} e={e} onSave={onSave} showName name={staffName(e.staffId)} />)}
        {dayEntries.length === 0 && <p className="py-6 text-center text-sm text-cream/40">No punches on this day.</p>}
      </div>
    </Modal>
  );
}

function TipCorrection({ row, onClose, onSave }: {
  row: Row; onClose: () => void; onSave: (amountCents: number, reason: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"add" | "subtract">("add");
  const [reason, setReason] = useState("");
  const parsed = parseFloat(amount);
  const cents = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) * (direction === "add" ? 1 : -1) : 0;
  return (
    <Modal open onClose={onClose} title={`Tip correction — ${row.staff.name}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="gold" onClick={() => cents && onSave(cents, reason.trim())} disabled={!cents}>Record correction</Btn></>}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-cream/50">
          Tips come from checkouts ({formatMoney(row.tipsCents)} this period) and aren&apos;t overwritten —
          a correction is recorded as its own adjustment so there&apos;s a paper trail.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Direction">
            <select className="input" value={direction} onChange={(e) => setDirection(e.target.value as "add" | "subtract")}>
              <option value="add">Add missed tips</option>
              <option value="subtract">Remove overcounted tips</option>
            </select>
          </Field>
          <Field label="Amount">
            <div className="flex items-center gap-2"><span className="text-sm text-cream/50">$</span>
              <input className="input" inputMode="decimal" value={amount} placeholder="0.00"
                onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v); }} /></div>
          </Field>
        </div>
        <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cash tips not rung in on Tuesday" /></Field>
      </div>
    </Modal>
  );
}

function AdjustmentModal({ staff, onClose, onSave }: {
  staff: Staff[]; onClose: () => void; onSave: (a: Omit<PayrollAdjustment, "id">) => void;
}) {
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [kind, setKind] = useState<PayrollAdjustment["kind"]>("Bonus");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const parsed = parseFloat(amount);
  const cents = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
  const signed = kind === "Deduction" ? -cents : cents;
  return (
    <Modal open onClose={onClose} title="Add adjustment"
      footer={<><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="gold" disabled={!cents || !label.trim()}
          onClick={() => onSave({ staffId, kind, label: label.trim(), amountCents: signed, dateISO: new Date().toISOString() })}>
          Add {kind.toLowerCase()}
        </Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employee">
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as PayrollAdjustment["kind"])}>
              {(["Bonus", "Deduction", "Reimbursement"] as const).map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Amount" hint={kind === "Deduction" ? "Recorded as a negative adjustment" : undefined}>
          <div className="flex items-center gap-2"><span className="text-sm text-cream/50">$</span>
            <input className="input" inputMode="decimal" value={amount} placeholder="0.00"
              onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v); }} /></div>
        </Field>
        <Field label="Reason"><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Holiday bonus" /></Field>
      </div>
    </Modal>
  );
}

function AddEntryModal({ staff, onClose, onSave }: {
  staff: Staff[]; onClose: () => void; onSave: (e: Omit<TimeEntry, "id">) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(todayStr);
  const [inT, setInT] = useState("09:45");
  const [outT, setOutT] = useState("18:30");
  const inISO = date ? new Date(`${date}T${inT}:00`).toISOString() : "";
  const outISO = date ? new Date(`${date}T${outT}:00`).toISOString() : "";
  const valid = !!date && Date.parse(outISO) > Date.parse(inISO);
  const hrs = valid ? (Date.parse(outISO) - Date.parse(inISO)) / 3_600_000 : 0;
  return (
    <Modal open onClose={onClose} title="Add time entry"
      footer={<><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="gold" disabled={!valid}
          onClick={() => onSave({ staffId, clockInISO: inISO, clockOutISO: outISO, note: "Manual entry — added in payroll", approved: true, edited: false })}>
          Add entry{valid ? ` (${h1(hrs)}h)` : ""}
        </Btn></>}>
      <div className="space-y-4">
        <Field label="Employee">
          <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {staff.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" className="input" value={date} max={todayStr} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Clock in"><input type="time" className="input" value={inT} onChange={(e) => setInT(e.target.value)} /></Field>
          <Field label="Clock out"><input type="time" className="input" value={outT} onChange={(e) => setOutT(e.target.value)} /></Field>
        </div>
        {!valid && <p className="text-xs text-red-300">Clock-out must be after clock-in.</p>}
      </div>
    </Modal>
  );
}

/** Hours ring + legend (the shared MoneyDonut formats dollars; this one is hours). */
function HoursDonut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const size = 132, thickness = 18;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
          {segments.map((sg) => {
            const len = (sg.value / total) * c;
            const el = <circle key={sg.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sg.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div><div className="text-lg font-semibold text-cream">{h1(total)}</div><div className="text-[10px] text-cream/45">Total Hours</div></div>
        </div>
      </div>
      <ul className="min-w-[150px] flex-1 space-y-1.5 text-[12px]">
        {segments.map((sg) => (
          <li key={sg.label} className="flex items-baseline gap-2">
            <span className="h-2 w-2 shrink-0 translate-y-px rounded-full" style={{ background: sg.color }} />
            <span className="min-w-0 flex-1 truncate text-cream/65">{sg.label}</span>
            <span className="tabular-nums text-cream/85">{h1(sg.value)}</span>
            <span className="w-11 text-right tabular-nums text-cream/40">{((sg.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Alert({ tone, text, sub, action, onAction }: {
  tone: "red" | "gold" | "blue"; text: string; sub: string; action: string; onAction: () => void;
}) {
  const dots = { red: "bg-red-400", gold: "bg-brass", blue: "bg-sky-400" };
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
      <span className={cx("h-2 w-2 shrink-0 rounded-full", dots[tone])} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-cream/85">{text}</span>
        <span className="block truncate text-[11px] text-cream/40">{sub}</span>
      </span>
      <button onClick={onAction} className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-cream/70 transition hover:border-brass/40 hover:text-brass">
        {action}
      </button>
    </li>
  );
}

function QuickAction({ icon, title, sub, onClick }: { icon: "check" | "clock" | "dollar" | "plus"; title: string; sub: string; onClick: () => void }) {
  const I = Icon[icon];
  return (
    <button onClick={onClick} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition hover:border-brass/30">
      <span className="mb-1.5 grid h-8 w-8 place-items-center rounded-lg bg-brass/15 text-brass"><I className="h-4 w-4" /></span>
      <span className="block text-[13px] font-semibold text-cream">{title}</span>
      <span className="block text-[11px] leading-snug text-cream/45">{sub}</span>
    </button>
  );
}
