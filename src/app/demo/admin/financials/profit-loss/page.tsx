"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, SectionTitle, SandboxNote } from "@/components/demo/ui";
import { StatCard, Select, TableWrap, Th, Td, ProgressBar, cx, formatMoney } from "@/components/demo/finance";
import { coreFinancials } from "@/lib/demo/financials";
import { Icon } from "@/components/home/icons";

// P&L looks at whole periods rather than the shared range presets, so it gets
// its own view switch (the spec's monthly / quarterly / yearly / custom).
const VIEWS = [
  { id: "monthly", label: "Monthly", factor: 1, periods: 6, step: "month" },
  { id: "quarterly", label: "Quarterly", factor: 3, periods: 4, step: "quarter" },
  { id: "yearly", label: "Yearly", factor: 12, periods: 3, step: "year" },
  { id: "custom", label: "Custom Range", factor: 2, periods: 2, step: "month" },
] as const;

export default function ProfitLossPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [viewId, setViewId] = useState<string>("monthly");
  const view = VIEWS.find((v) => v.id === viewId) ?? VIEWS[0];

  const core = useMemo(() => coreFinancials(state), [state]);
  const f = view.factor;
  const $ = (cents: number) => formatMoney(Math.round(cents * f));

  const revenueLines = core.revenueLines.map((l) => ({ ...l, value: Math.round(l.value * f) }));
  const revenue = revenueLines.reduce((s, l) => s + l.value, 0);

  // Operating expense lines, rolled up from the ledger's categories into the
  // P&L's coarser buckets.
  const bucket = (name: string): string => {
    const map: Record<string, string> = {
      Rent: "Rent", Utilities: "Utilities", Advertising: "Marketing",
      "Booking software": "Software", "Card processing": "Operating Expenses",
      Insurance: "Operating Expenses", Laundry: "Chair Expenses", Cleaning: "Chair Expenses",
      "Chair maintenance": "Chair Expenses", "Equipment repairs": "Chair Expenses",
      Supplies: "Chair Expenses", Furniture: "Chair Expenses",
    };
    return map[name] ?? "Other";
  };
  const opMap = new Map<string, number>();
  for (const e of core.expensesByCategory) opMap.set(bucket(e.name), (opMap.get(bucket(e.name)) ?? 0) + e.value);

  const cogsLines = [
    { name: "Payroll", value: Math.round(core.payroll * f) },
    { name: "Inventory", value: Math.round(core.inventory * f) },
  ];
  const opLines = [...opMap.entries()].map(([name, value]) => ({ name, value: Math.round(value * f) })).sort((a, b) => b.value - a.value);

  const cogs = cogsLines.reduce((s, l) => s + l.value, 0);
  const opex = opLines.reduce((s, l) => s + l.value, 0);
  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - opex;
  const net = operatingProfit;
  const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue ? (net / revenue) * 100 : 0;

  // Period-by-period trend for the comparison table.
  const now = new Date();
  const periods = Array.from({ length: view.periods }, (_, i) => {
    const back = view.periods - 1 - i;
    const growth = 0.62 + (i / Math.max(1, view.periods - 1)) * 0.38;
    let label: string;
    if (view.step === "year") label = String(now.getFullYear() - back);
    else if (view.step === "quarter") label = `Q${((Math.floor(now.getMonth() / 3) - back + 8) % 4) + 1}`;
    else label = new Date(now.getFullYear(), now.getMonth() - back, 1).toLocaleDateString(undefined, { month: "short" });
    const r = Math.round(revenue * growth);
    const c = Math.round(cogs * growth * 1.02);
    const o = Math.round(opex * growth * 0.98);
    return { label, revenue: r, cogs: c, opex: o, gross: r - c, net: r - c - o };
  });

  return (
    <>
      <PageHeader
        title="Profit & Loss"
        subtitle="Where the money comes from, what it costs to earn, and what's left."
        actions={
          <>
            <Select value={viewId} onChange={setViewId} options={VIEWS.map((v) => ({ id: v.id, label: v.label }))} />
            <button onClick={() => toast("Sample P&L exported — real exports ship with the live feature", "success")} className="p-btn-gold">
              <Icon.reports className="h-4 w-4" /> Export Report
            </button>
          </>
        }
      />
      <SandboxNote>Preview of a planned feature — figures are simulated sample data. Financials aren&apos;t in the live product yet.</SandboxNote>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatMoney(revenue)} icon="dollar" delta={14.6} />
        <StatCard label="Gross Profit" value={formatMoney(grossProfit)} icon="analytics" delta={12.1} sub={`${grossMargin.toFixed(1)}% margin`} />
        <StatCard label="Operating Profit" value={formatMoney(operatingProfit)} icon="growth" delta={9.3} />
        <StatCard label="Net Margin" value={`${netMargin.toFixed(1)}%`} icon="gauge" delta={-1.8} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle right={<span className="text-xs text-cream/45">{view.label}</span>}>Statement</SectionTitle>
          <dl className="text-sm">
            <Group title="Revenue" />
            {revenueLines.map((l) => <Line key={l.name} label={l.name} value={formatMoney(l.value)} />)}
            <Total label="Total Revenue" value={formatMoney(revenue)} />

            <Group title="Cost of Sales" />
            {cogsLines.map((l) => <Line key={l.name} label={l.name} value={`-${formatMoney(l.value)}`} negative />)}
            <Total label="Gross Profit" value={formatMoney(grossProfit)} accent />

            <Group title="Operating Expenses" />
            {opLines.map((l) => <Line key={l.name} label={l.name} value={`-${formatMoney(l.value)}`} negative />)}
            <Total label="Operating Profit" value={formatMoney(operatingProfit)} accent />

            <div className="mt-3 flex items-baseline justify-between border-t border-white/12 pt-3">
              <span className="text-base font-semibold text-cream">Net Profit</span>
              <span className={cx("text-lg font-semibold", net >= 0 ? "text-brass" : "text-red-300")}>
                {net < 0 ? "-" : ""}{formatMoney(Math.abs(net))}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1"><ProgressBar pct={Math.max(0, netMargin)} tone={net >= 0 ? "gold" : "red"} /></div>
              <span className="text-xs text-cream/45">{netMargin.toFixed(1)}% net margin</span>
            </div>
          </dl>
        </Panel>

        <div className="min-w-0 space-y-4">
          <Panel>
            <SectionTitle>Revenue Mix</SectionTitle>
            <ul className="space-y-3">
              {revenueLines.filter((l) => l.value > 0).map((l) => (
                <li key={l.name}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-cream/80">{l.name}</span>
                    <span className="flex items-baseline gap-3">
                      <span className="font-medium text-cream">{formatMoney(l.value)}</span>
                      <span className="w-11 text-right text-xs text-cream/45">{((l.value / (revenue || 1)) * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                  <ProgressBar pct={(l.value / (revenue || 1)) * 100} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-cream/40">
              Chair rentals are shop income in their own right — the renters&apos; service revenue is not counted here.
            </p>
          </Panel>

          <Panel>
            <SectionTitle>Period Comparison</SectionTitle>
            <TableWrap min={460}>
              <thead>
                <tr>
                  <Th>Period</Th><Th right>Revenue</Th><Th right>Gross</Th><Th right>Net</Th><Th right>Margin</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {periods.map((p, i) => (
                  <tr key={i} className={cx(i === periods.length - 1 && "bg-brass/[0.04]")}>
                    <Td className="text-cream/85">{p.label}</Td>
                    <Td right><span className="text-cream/80">{formatMoney(p.revenue)}</span></Td>
                    <Td right><span className="text-cream/60">{formatMoney(p.gross)}</span></Td>
                    <Td right><span className={p.net >= 0 ? "text-emerald-300" : "text-red-300"}>{formatMoney(p.net)}</span></Td>
                    <Td right><span className="text-cream/60">{p.revenue ? ((p.net / p.revenue) * 100).toFixed(1) : "0"}%</span></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Group({ title }: { title: string }) {
  return <dt className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/35">{title}</dt>;
}

function Line({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-cream/65">{label}</dt>
      <dd className={negative ? "text-red-300/85" : "text-cream/85"}>{value}</dd>
    </div>
  );
}

function Total({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-white/8 pt-2">
      <dt className="font-semibold text-cream/80">{label}</dt>
      <dd className={cx("font-semibold", accent ? "text-brass" : "text-cream")}>{value}</dd>
    </div>
  );
}
