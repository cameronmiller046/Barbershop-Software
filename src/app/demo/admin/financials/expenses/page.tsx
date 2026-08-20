"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, SectionTitle, SandboxNote } from "@/components/demo/ui";
import {
  StatCard, MoneyDonut, Select, RANGES, rangeFactor, TableWrap, Th, Td,
  DONUT_COLORS, cx, formatMoney,
} from "@/components/demo/finance";
import { expenses, chairRentals, coreFinancials, LOCATIONS } from "@/lib/demo/financials";
import { Icon } from "@/components/home/icons";

const ALL = "all";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function ExpensesPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [rangeId, setRangeId] = useState("month");
  const [location, setLocation] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [chair, setChair] = useState(ALL);
  const [barber, setBarber] = useState(ALL);
  const [vendor, setVendor] = useState(ALL);

  const factor = rangeFactor(rangeId);
  const $ = (cents: number) => formatMoney(Math.round(cents * factor));

  const all = useMemo(() => expenses(state), [state]);
  const rentals = useMemo(() => chairRentals(state), [state]);
  const core = useMemo(() => coreFinancials(state), [state]);

  const staffName = (id: string | null) => (id ? state.staff.find((s) => s.id === id)?.name ?? null : null);

  const rows = useMemo(() => all.filter((e) =>
    (location === ALL || e.location === location) &&
    (category === ALL || e.category === category) &&
    (chair === ALL || e.chairId === chair) &&
    (barber === ALL || e.staffId === barber) &&
    (vendor === ALL || e.vendor === vendor),
  ), [all, location, category, chair, barber, vendor]);

  const total = rows.reduce((s, e) => s + e.amountCents, 0);
  const chairTotal = rows.filter((e) => e.chairRelated).reduce((s, e) => s + e.amountCents, 0);
  const recurringTotal = rows.filter((e) => e.recurring).reduce((s, e) => s + e.amountCents, 0);

  const categories = [...new Set(all.map((e) => e.category))].sort();
  const vendors = [...new Set(all.map((e) => e.vendor))].sort();

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of rows) m.set(e.category, (m.get(e.category) ?? 0) + e.amountCents);
    return [...m.entries()].sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value: Math.round(value * factor), color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  }, [rows, factor]);

  const resetFilters = () => { setLocation(ALL); setCategory(ALL); setChair(ALL); setBarber(ALL); setVendor(ALL); };
  const filtered = [location, category, chair, barber, vendor].some((v) => v !== ALL);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Every cost the shop carries — including chair expenses raised in Chair Rentals."
        actions={
          <>
            <Select value={rangeId} onChange={setRangeId} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
            <button onClick={() => toast("Expense entry ships with the live feature", "info")} className="p-btn-gold">
              <Icon.plus className="h-4 w-4" /> Add Expense
            </button>
          </>
        }
      />
      <SandboxNote>Preview of a planned feature — figures are simulated sample data. Expenses aren&apos;t in the live product yet.</SandboxNote>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Expenses" value={$(total)} icon="payments" delta={6.8} invert />
        <StatCard label="Chair Expenses" value={$(chairTotal)} icon="staff" delta={4.1} invert />
        <StatCard label="Recurring" value={$(recurringTotal)} icon="clock" sub={`${rows.filter((e) => e.recurring).length} of ${rows.length} line items`} />
        <StatCard label="Expense Ratio" value={`${core.revenue ? ((core.expenses / core.revenue) * 100).toFixed(1) : "0"}%`} icon="gauge" sub="of total revenue" />
      </div>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={location} onChange={setLocation} options={[{ id: ALL, label: "All Locations" }, ...LOCATIONS.map((l) => ({ id: l, label: l }))]} />
          <Select value={category} onChange={setCategory} options={[{ id: ALL, label: "All Categories" }, ...categories.map((c) => ({ id: c, label: c }))]} />
          <Select value={chair} onChange={setChair} options={[{ id: ALL, label: "All Chairs" }, ...rentals.map((r) => ({ id: r.chairId, label: r.chairLabel }))]} />
          <Select value={barber} onChange={setBarber} options={[{ id: ALL, label: "All Barbers" }, ...state.staff.map((s) => ({ id: s.id, label: s.name }))]} />
          <Select value={vendor} onChange={setVendor} options={[{ id: ALL, label: "All Vendors" }, ...vendors.map((v) => ({ id: v, label: v }))]} />
          {filtered && (
            <button onClick={resetFilters} className="text-xs font-semibold text-brass hover:underline">Clear filters</button>
          )}
          <span className="ml-auto text-xs text-cream/40">{rows.length} line item{rows.length === 1 ? "" : "s"}</span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="min-w-0">
          <SectionTitle>Expense Ledger</SectionTitle>
          {rows.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
              <span className="text-cream/70">No expenses match these filters</span>
              <button onClick={resetFilters} className="mt-2 text-sm font-semibold text-brass hover:underline">Clear filters</button>
            </div>
          ) : (
            <TableWrap min={860}>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Category</Th><Th>Vendor</Th><Th>Chair</Th><Th>Barber</Th>
                  <Th>Location</Th><Th>Allocation</Th><Th right>Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((e) => (
                  <tr key={e.id} className="transition hover:bg-white/[0.02]">
                    <Td className="whitespace-nowrap text-cream/60">{fmtDate(e.dateISO)}</Td>
                    <Td>
                      <span className="text-cream/90">{e.category}</span>
                      {e.recurring && <span className="ml-2 rounded-full border border-white/12 px-1.5 py-0.5 text-[10px] text-cream/45">Recurring</span>}
                    </Td>
                    <Td className="text-cream/60">{e.vendor}</Td>
                    <Td className="text-cream/60">{e.chairId ?? <span className="text-cream/25">Shared</span>}</Td>
                    <Td className="text-cream/60">{staffName(e.staffId) ?? <span className="text-cream/25">—</span>}</Td>
                    <Td className="text-cream/60">{e.location}</Td>
                    <Td><span className="text-[11px] text-cream/45">{e.allocation}</span></Td>
                    <Td right><span className="font-medium text-red-300">-{$(e.amountCents)}</span></Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <Td className="pt-3 font-semibold text-cream">Total</Td>
                  <Td><span /></Td><Td><span /></Td><Td><span /></Td><Td><span /></Td><Td><span /></Td><Td><span /></Td>
                  <Td right><span className="pt-3 text-base font-semibold text-red-300">-{$(total)}</span></Td>
                </tr>
              </tfoot>
            </TableWrap>
          )}
        </Panel>

        <div className="min-w-0 space-y-4">
          <Panel>
            <SectionTitle>By Category</SectionTitle>
            {byCategory.length ? (
              <MoneyDonut
                size={140}
                segments={byCategory}
                center={<div><div className="text-sm font-semibold text-cream">{$(total)}</div><div className="text-[10px] text-cream/45">Total</div></div>}
              />
            ) : <p className="text-sm text-cream/40">Nothing to chart.</p>}
          </Panel>

          <Panel>
            <SectionTitle>Allocation Methods</SectionTitle>
            <p className="mb-3 text-[11px] leading-relaxed text-cream/45">
              Shared costs are divided across occupied chairs so each chair carries its true cost.
            </p>
            <ul className="space-y-2 text-[13px]">
              {["Equal per occupied chair", "Based on revenue", "Manual", "No allocation"].map((m) => {
                const list = rows.filter((e) => e.allocation === m);
                const sum = list.reduce((s, e) => s + e.amountCents, 0);
                return (
                  <li key={m} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                    <span className="min-w-0 truncate text-cream/70">{m}</span>
                    <span className="shrink-0 text-cream/45">{list.length}</span>
                    <span className="shrink-0 font-medium text-cream">{$(sum)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-cream/50">
              <span className="text-cream/70">Example — </span>
              a {formatMoney(20000)} laundry bill across {chairRentals(state).filter((r) => r.occupied).length} occupied chairs
              allocates {formatMoney(Math.round(20000 / Math.max(1, chairRentals(state).filter((r) => r.occupied).length)))} to each.
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
