"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { PageHeader, Panel, SectionTitle, SandboxNote } from "@/components/demo/ui";
import { Sparkline } from "@/components/demo/charts";
import { useToast } from "@/components/demo/toast";
import {
  StatCard, MoneyDonut, BarList, Select, RANGES, rangeFactor, topWithOther,
  TableWrap, Th, Td, GOLD, GOLD_DIM, GRAY, GRAY_LT, GREEN, cx, formatMoney,
} from "@/components/demo/finance";
import { coreFinancials, chairRentals, transactions } from "@/lib/demo/financials";
import { Icon, type IconName } from "@/components/home/icons";

/** Grouped revenue/expense bars with a dotted net-profit line. */
function PnLChart({ months }: { months: { label: string; rev: number; exp: number }[] }) {
  const W = 640, H = 250, padL = 44, padR = 10, padT = 14, padB = 26;
  const nets = months.map((m) => m.rev - m.exp);
  const hi = Math.max(1, ...months.map((m) => Math.max(m.rev, m.exp)));
  const lo = Math.min(0, ...nets);
  // Clean 1/2/5×10ⁿ tick step sized to the data.
  const rough = Math.max(1, (hi - lo) / 4);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const STEP = ([1, 2, 5].find((m) => m * pow >= rough) ?? 10) * pow;
  const top = Math.ceil(hi / STEP) * STEP;
  const bot = Math.floor(lo / STEP) * STEP;
  const y = (v: number) => padT + ((top - v) / (top - bot || 1)) * (H - padT - padB);
  const ticks: number[] = [];
  for (let v = bot; v <= top; v += STEP) ticks.push(v);
  const slot = (W - padL - padR) / months.length;
  const bw = Math.min(26, slot * 0.22);
  const cxOf = (i: number) => padL + slot * i + slot / 2;
  const fmtK = (v: number) => {
    const d = Math.abs(v) / 100, sign = v < 0 ? "-" : "";
    if (d >= 1000) return `${sign}$${(d / 1000).toFixed(STEP % 100000 === 0 ? 0 : 1)}K`;
    return `${sign}$${Math.round(d)}`;
  };
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly revenue, expenses and net profit">
        <defs>
          <linearGradient id="pnl_rev" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#eccb7f" /><stop offset="100%" stopColor={GOLD_DIM} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"} strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="rgba(240,234,220,0.4)">{fmtK(t)}</text>
          </g>
        ))}
        {months.map((m, i) => (
          <g key={i}>
            <rect x={cxOf(i) - bw - 2} y={y(Math.max(0, m.rev))} width={bw} height={Math.abs(y(m.rev) - y(0))} rx="3" fill="url(#pnl_rev)" />
            <rect x={cxOf(i) + 2} y={y(Math.max(0, m.exp))} width={bw} height={Math.abs(y(m.exp) - y(0))} rx="3" fill={GRAY} />
            <text x={cxOf(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="rgba(240,234,220,0.45)">{m.label}</text>
          </g>
        ))}
        <polyline points={nets.map((n, i) => `${cxOf(i)},${y(n)}`).join(" ")}
          fill="none" stroke="rgba(240,234,220,0.85)" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" />
        {nets.map((n, i) => <circle key={i} cx={cxOf(i)} cy={y(n)} r="3" fill="#f0eadc" />)}
      </svg>
    </div>
  );
}

function LegendDot({ color, label, dotted }: { color?: string; label: string; dotted?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-cream/55">
      {dotted ? <span className="inline-block w-4 border-t-2 border-dotted border-cream/80" />
        : <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  );
}

const TX_ICON: Record<string, IconName> = {
  "Service sale": "scissors", "Product sale": "inventory", "Chair rent": "staff",
  Expense: "payments", Refund: "arrow", Payroll: "dollar",
};

export default function FinancialsOverviewPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [rangeId, setRangeId] = useState("month");
  const [banner, setBanner] = useState(true);
  const factor = rangeFactor(rangeId);
  const $ = (cents: number) => formatMoney(Math.round(cents * factor));

  const core = useMemo(() => coreFinancials(state), [state]);
  const rentals = useMemo(() => chairRentals(state), [state]);
  const txs = useMemo(() => transactions(state).slice(0, 5), [state]);

  const months = useMemo(() => {
    const now = new Date();
    const growth = [0.6, 0.74, 0.82, 0.93, 1];
    const wobble = [1.08, 0.97, 1.04, 0.95, 1];
    const expRatio = core.revenue ? (core.expenses + core.cogs) / core.revenue : 0.6;
    return growth.map((g, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return {
        label: d.toLocaleDateString(undefined, { month: "short" }),
        rev: Math.round(core.revenue * g),
        exp: Math.round(core.revenue * g * expRatio * wobble[i]),
      };
    });
  }, [core]);

  // Payment mix from completed appointments.
  const mix = useMemo(() => {
    const m = { card: 0, cash: 0, wallet: 0 };
    for (const a of state.appointments) if (a.status === "completed" && a.paymentMethod) m[a.paymentMethod] += a.priceCents + a.tipCents;
    return m;
  }, [state]);
  const mixTotal = mix.card + mix.cash + mix.wallet;

  // Locations: this shop's actuals plus simulated sister shops.
  const locations = useMemo(() => {
    const shopName = state.settings.name.replace(" — Flagship", "");
    return [
      { name: `${shopName} (Main St.)`, mult: 1, marginAdj: 0 },
      { name: "Midtown", mult: 0.77, marginAdj: -3.3 },
      { name: "Buckhead", mult: 0.91, marginAdj: -2.4 },
      { name: "Sandy Springs", mult: 0.63, marginAdj: -3.6 },
    ].map((l, i) => ({
      name: l.name,
      revenue: Math.round(core.revenue * l.mult),
      net: Math.round(core.net * l.mult * (1 + l.marginAdj / Math.max(1, core.margin))),
      margin: core.margin + l.marginAdj,
      trend: [4, 5, 4.5, 6, 5.5, 7, 8].map((v, j) => v * (1 + ((i * 7 + j) % 5) * 0.06)),
    }));
  }, [core, state.settings.name]);

  // Roll the long tail into "Other" so the ring sums to the total in its centre.
  const expenseSegments = topWithOther(
    core.expensesByCategory.map((e) => ({ name: e.name, value: Math.round(e.value * factor) })), 5,
  );
  const occupied = rentals.filter((r) => r.occupied).length;

  return (
    <>
      <PageHeader
        title="Financial Reports"
        subtitle="Track performance. Grow your barbershop."
        actions={
          <>
            <Select value={rangeId} onChange={setRangeId} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
            <button onClick={() => toast("Sample report exported — real exports ship with the live feature", "success")} className="p-btn-gold">
              <Icon.reports className="h-4 w-4" /> Export Report
            </button>
          </>
        }
      />
      <SandboxNote>Preview of a planned feature — figures are simulated sample data. Financials aren&apos;t in the live product yet.</SandboxNote>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
            <StatCard label="Total Revenue" value={$(core.revenue)} icon="dollar" delta={14.6} />
            <StatCard label="Gross Profit" value={$(core.grossProfit)} icon="analytics" delta={12.1} />
            <StatCard label="Net Profit" value={$(core.net)} icon="growth" delta={9.3} />
            <StatCard label="Expenses" value={$(core.expenses)} icon="payments" delta={6.8} invert />
            <StatCard label="Net Profit Margin" value={`${core.margin.toFixed(1)}%`} icon="gauge" delta={-1.8} />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cream">Profit &amp; Loss Overview</h2>
                <a href="/demo/admin/financials/profit-loss" className="text-xs font-semibold text-brass hover:underline">Full statement</a>
              </div>
              <div className="mb-2 flex gap-4">
                <LegendDot color={GOLD} label="Revenue" />
                <LegendDot color={GRAY} label="Expenses" />
                <LegendDot dotted label="Net Profit" />
              </div>
              <PnLChart months={months} />
            </Panel>

            <Panel className="lg:col-span-2">
              <SectionTitle right={<span className="text-[11px] text-cream/40">Revenue</span>}>Top Income Categories</SectionTitle>
              <BarList items={core.revenueLines.filter((l) => l.value > 0)} fmt={$} />
              <div className="mt-4 flex items-baseline justify-between border-t border-white/8 pt-3">
                <span className="text-sm font-semibold text-cream/80">Total Revenue</span>
                <span className="text-base font-semibold text-brass">{$(core.revenue)}</span>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-2">
              <SectionTitle>Expense Breakdown</SectionTitle>
              <MoneyDonut
                segments={expenseSegments}
                center={<div><div className="text-base font-semibold text-cream">{$(core.expenses)}</div><div className="text-[10px] text-cream/45">Total Expenses</div></div>}
              />
              <a href="/demo/admin/financials/expenses" className="p-btn-ghost mt-5 w-full justify-center text-xs">View Expense Report</a>
            </Panel>

            <Panel className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cream">Location Performance</h2>
                <Select value="all" onChange={() => {}} options={[{ id: "all", label: "All Locations" }]} />
              </div>
              <TableWrap min={440}>
                <thead>
                  <tr><Th>Location</Th><Th right>Revenue</Th><Th right>Net Profit</Th><Th right>Margin</Th><Th right>Trend</Th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {locations.map((l) => (
                    <tr key={l.name}>
                      <Td className="text-cream/85">{l.name}</Td>
                      <Td right><span className="text-cream">{$(l.revenue)}</span></Td>
                      <Td right><span className="text-cream">{$(l.net)}</span></Td>
                      <Td right><span className="text-cream/70">{l.margin.toFixed(1)}%</span></Td>
                      <Td right><span className="inline-block"><Sparkline data={l.trend} color={GREEN} width={70} height={20} /></span></Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <button onClick={() => toast("Multi-location view is part of the full release", "info")} className="p-btn-ghost mt-4 w-full justify-center text-xs">
                View All Locations
              </button>
            </Panel>
          </div>

          {banner && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brass/25 bg-gradient-to-r from-[#2a2314] via-[#1c1710] to-[#2a2314] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brass/15 text-brass"><Icon.scissors className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-cream">You&apos;re doing great! 🎉</div>
                <div className="text-xs text-cream/60">Revenue is up 14.6% compared to last month. Keep the momentum going!</div>
              </div>
              <button onClick={() => toast("Goals & benchmarks are part of the full release", "info")} className="shrink-0 rounded-full border border-brass/40 px-3.5 py-1.5 text-xs font-semibold text-brass transition hover:bg-brass/10">
                Set Goal
              </button>
              <button onClick={() => setBanner(false)} aria-label="Dismiss" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-cream/40 transition hover:bg-white/5 hover:text-cream">✕</button>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <Panel>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-cream">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brass/15 text-brass"><Icon.payments className="h-4 w-4" /></span>
              Cash Summary
            </div>
            <div className="mt-2 text-3xl font-semibold text-cream">{$(core.net)}</div>
            <div className="text-xs text-cream/45">Net Cash Flow</div>
            <div className="mt-3"><Sparkline data={[4, 3.4, 4.2, 3.8, 3.2, 4.6, 4.1, 5.6, 6.4]} color={GOLD} width={280} height={44} /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-xs">
              <div><div className="text-cream/45">Cash In</div><div className="mt-0.5 font-medium text-emerald-300">{$(core.cashIn)}</div></div>
              <div><div className="text-cream/45">Cash Out</div><div className="mt-0.5 font-medium text-red-300">-{$(core.cashOut)}</div></div>
              <div><div className="text-cream/45">Change</div><div className="mt-0.5 font-medium text-cream">{$(core.cashIn - core.cashOut)}</div></div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle right={<a href="/demo/admin/financials/chair-rentals" className="text-xs font-semibold text-brass hover:underline">Details</a>}>
              Chair Rentals
            </SectionTitle>
            <div className="text-2xl font-semibold text-cream">{$(core.chairRent)}</div>
            <div className="text-xs text-cream/45">Rent collected this period</div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-xs">
              <div><div className="text-cream/45">Occupied</div><div className="mt-0.5 font-medium text-cream">{occupied} / {rentals.length} chairs</div></div>
              <div><div className="text-cream/45">Chair costs</div><div className="mt-0.5 font-medium text-red-300">-{$(core.chairExpenses)}</div></div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Payment Mix</SectionTitle>
            <MoneyDonut
              size={140}
              segments={[
                { label: "Cash", value: mix.cash || 1, color: GOLD },
                { label: "Card", value: mix.card || 1, color: GOLD_DIM },
                { label: "Mobile", value: mix.wallet || 1, color: GRAY_LT },
              ]}
              center={<div><div className="text-[10px] text-cream/45">Total</div><div className="text-sm font-semibold text-cream">{$(mixTotal)}</div></div>}
            />
          </Panel>

          <Panel>
            <SectionTitle right={<a href="/demo/admin/financials/transactions" className="text-xs font-semibold text-brass hover:underline">View All</a>}>
              Recent Transactions
            </SectionTitle>
            <ul className="divide-y divide-white/5">
              {txs.map((t) => {
                const I = Icon[TX_ICON[t.type] ?? "payments"];
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-cream/60"><I className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-cream/85">{t.description}</span>
                      <span className="block text-[11px] text-cream/40">{t.type}</span>
                    </span>
                    <span className={cx("shrink-0 text-sm font-semibold", t.amountCents >= 0 ? "text-brass" : "text-red-300")}>
                      {t.amountCents < 0 ? "-" : ""}{formatMoney(Math.abs(t.amountCents))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
