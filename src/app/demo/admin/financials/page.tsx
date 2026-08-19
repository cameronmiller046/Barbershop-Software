"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { PageHeader, Panel, SectionTitle, SandboxNote, cx } from "@/components/demo/ui";
import { Sparkline } from "@/components/demo/charts";
import { useToast } from "@/components/demo/toast";
import { Icon, type IconName } from "@/components/home/icons";
import { formatMoney } from "@/lib/utils";
import { totalRevenue, totalTips, isRevenue } from "@/lib/demo/metrics";

const GOLD = "#d8b25c";
const GOLD_DIM = "#8a6f35";
const GRAY = "#55555e";
const GRAY_LT = "#9ca3af";
const GREEN = "#34d399";

// Date-range presets. The demo store only carries ~a month of appointments, so
// wider ranges scale the period deterministically instead of filtering to
// mostly-empty history (the page is a simulated preview either way).
const RANGES = [
  { id: "month", label: "This Month", factor: 1 },
  { id: "last", label: "Last Month", factor: 0.872 },
  { id: "quarter", label: "Last 90 Days", factor: 2.94 },
  { id: "year", label: "This Year", factor: 10.4 },
] as const;

function select(value: string, onChange: (v: string) => void, options: { id: string; label: string }[]) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-white/10 bg-[#17161b] px-3 py-1.5 text-xs text-cream focus:border-brass/50 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

function StatCard({
  label, value, icon, delta, invert,
}: { label: string; value: string; icon: IconName; delta: number; invert?: boolean }) {
  const I = Icon[icon];
  const good = invert ? delta < 0 : delta >= 0;
  return (
    <div className="p-panel min-w-0 p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brass/30 bg-brass/10 text-brass">
          <I className="h-4 w-4" />
        </span>
        <span className="truncate text-[13px] text-cream/70">{label}</span>
      </div>
      <div className="mt-2.5 truncate text-xl font-semibold text-cream sm:text-2xl">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
        <span className={cx("font-semibold", good ? "text-emerald-300" : "text-red-300")}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
        </span>
        <span className="text-cream/40">vs last month</span>
      </div>
    </div>
  );
}

/** Grouped revenue/expense bars with a dotted net-profit line. */
function PnLChart({ months }: { months: { label: string; rev: number; exp: number }[] }) {
  const W = 640, H = 250, padL = 44, padR = 10, padT = 14, padB = 26;
  const nets = months.map((m) => m.rev - m.exp);
  const hi = Math.max(1, ...months.map((m) => Math.max(m.rev, m.exp)));
  const lo = Math.min(0, ...nets);
  // Pick a clean 1/2/5×10ⁿ tick step sized to the data (demo revenue can be
  // hundreds or tens of thousands of dollars).
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
            <stop offset="0%" stopColor="#eccb7f" />
            <stop offset="100%" stopColor={GOLD_DIM} />
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
        <polyline
          points={nets.map((n, i) => `${cxOf(i)},${y(n)}`).join(" ")}
          fill="none" stroke="rgba(240,234,220,0.85)" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round"
        />
        {nets.map((n, i) => <circle key={i} cx={cxOf(i)} cy={y(n)} r="3" fill="#f0eadc" />)}
      </svg>
    </div>
  );
}

function LegendDot({ color, label, dotted }: { color?: string; label: string; dotted?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-cream/55">
      {dotted
        ? <span className="inline-block w-4 border-t-2 border-dotted border-cream/80" />
        : <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </span>
  );
}

/** Donut with a legend that shows share AND dollar amount (the shared Donut only shows %). */
function MoneyDonut({
  segments, center, size = 150, thickness = 20,
}: { segments: { label: string; value: number; color: string }[]; center: React.ReactNode; size?: number; thickness?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
                strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-cream/70">{s.label}</span>
            <span className="font-medium text-cream">{formatMoney(s.value)}</span>
            <span className="w-11 text-right text-cream/45">{((s.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TX_ICON: Record<string, IconName> = { service: "scissors", product: "inventory", supply: "payments" };

export default function FinancialsPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [rangeId, setRangeId] = useState<string>("month");
  const [banner, setBanner] = useState(true);
  const factor = RANGES.find((r) => r.id === rangeId)?.factor ?? 1;
  const $ = (cents: number) => formatMoney(Math.round(cents * factor));

  const M = useMemo(() => {
    const tips = totalTips(state);
    const serviceRev = totalRevenue(state) - tips;
    // Simulated product sales, proportional to real service revenue so the page
    // stays sensible however much the sandbox has booked (~6% of income, like
    // a typical shop's retail share).
    const retail = Math.round(serviceRev * 0.068);
    const revenue = serviceRev + retail;

    // Income by service category (+ retail as "Products").
    const catMap = new Map<string, number>();
    for (const a of state.appointments) {
      if (!isRevenue(a)) continue;
      const svc = state.services.find((v) => v.id === a.serviceId);
      if (!svc) continue;
      catMap.set(svc.category, (catMap.get(svc.category) ?? 0) + a.priceCents);
    }
    const income = [...catMap.entries()].map(([name, value]) => ({ name, value }));
    income.push({ name: "Products", value: retail });
    income.sort((a, b) => b.value - a.value);

    // Simulated cost structure as ratios of revenue (industry-plausible), so
    // margins hold at demo scale: COGS ≈ 39% (commissions + product cost),
    // operating expenses ≈ 28% → net margin ≈ 33%.
    const cogs = Math.round(revenue * 0.393);
    const expenses = Math.round(revenue * 0.278);
    const grossProfit = revenue - cogs;
    const net = grossProfit - expenses;
    const margin = revenue ? (net / revenue) * 100 : 0;
    const labor = Math.round(expenses * 0.479);
    const rent = Math.round(expenses * 0.311);
    const supplies = Math.round(expenses * 0.121);
    const marketing = Math.round(expenses * 0.049);
    const utilities = expenses - labor - rent - supplies - marketing;

    // Payment mix (service + tip on completed appointments).
    const mix = { card: 0, cash: 0, wallet: 0 };
    for (const a of state.appointments) if (a.status === "completed" && a.paymentMethod) mix[a.paymentMethod] += a.priceCents + a.tipCents;

    // Simulated 5-month trend anchored on the current period's actuals.
    const now = new Date();
    const growth = [0.6, 0.74, 0.82, 0.93, 1];
    const expRatio = revenue ? (expenses + cogs) / revenue : 0.6;
    const wobble = [1.08, 0.97, 1.04, 0.95, 1];
    const months = growth.map((g, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
      return {
        label: d.toLocaleDateString(undefined, { month: "short" }),
        rev: Math.round(revenue * g),
        exp: Math.round(revenue * g * expRatio * wobble[i]),
      };
    });

    // Recent transactions: latest completed appointments + one simulated supply run.
    const done = state.appointments
      .filter((a) => a.status === "completed")
      .sort((a, b) => b.startISO.localeCompare(a.startISO))
      .slice(0, 4)
      .map((a) => {
        const svc = state.services.find((v) => v.id === a.serviceId);
        const cust = state.customers.find((c) => c.id === a.customerId);
        const parts = (cust?.name ?? "Client").split(" ");
        const short = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
        const t = new Date(a.startISO);
        const today = t.toDateString() === now.toDateString();
        return {
          id: a.id, kind: "service" as const,
          title: `${svc?.name ?? "Service"} - ${short}`,
          when: `${today ? "Today" : t.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`,
          amount: a.priceCents + a.tipCents,
        };
      });
    const txs = [
      ...done.slice(0, 2),
      { id: "tx_supply", kind: "supply" as const, title: "Supplies Purchase", when: "Today, 1:20 PM", amount: -8650 },
      ...done.slice(2),
    ];

    // Location performance: this shop's actuals + simulated sister locations.
    const shopName = state.settings.name.replace(" — Flagship", "");
    const locations = [
      { name: `${shopName} (Main St.)`, mult: 1, marginAdj: 0 },
      { name: "Midtown", mult: 0.77, marginAdj: -3.3 },
      { name: "Buckhead", mult: 0.91, marginAdj: -2.4 },
      { name: "Sandy Springs", mult: 0.63, marginAdj: -3.6 },
    ].map((l, i) => ({
      name: l.name,
      revenue: Math.round(revenue * l.mult),
      net: Math.round(net * l.mult * (1 + l.marginAdj / Math.max(1, margin))),
      margin: margin + l.marginAdj,
      trend: [4, 5, 4.5, 6, 5.5, 7, 8].map((v, j) => v * (1 + ((i * 7 + j) % 5) * 0.06),
      ),
    }));

    return {
      revenue, tips, grossProfit, net, margin, expenses, income, mix, months, txs, locations,
      expenseLines: [
        { label: "Payroll", value: labor, color: GOLD },
        { label: "Rent", value: rent, color: GOLD_DIM },
        { label: "Supplies", value: supplies, color: GRAY_LT },
        { label: "Marketing", value: marketing, color: GRAY },
        { label: "Utilities", value: utilities, color: "#3b3b42" },
      ],
      cashIn: revenue + tips,
      cashOut: expenses + cogs,
    };
  }, [state]);

  const incomeMax = Math.max(1, ...M.income.map((i) => i.value));
  const incomeTotal = M.income.reduce((s, i) => s + i.value, 0) || 1;
  const mixTotal = M.mix.card + M.mix.cash + M.mix.wallet;

  return (
    <>
      <PageHeader
        title="Financial Reports"
        subtitle="Track performance. Grow your barbershop."
        actions={
          <>
            {select(rangeId, setRangeId, RANGES.map((r) => ({ id: r.id, label: r.label })))}
            <button
              onClick={() => toast("Sample report exported — real exports ship with the live feature", "success")}
              className="p-btn-gold"
            >
              <Icon.reports className="h-4 w-4" /> Export Report
            </button>
          </>
        }
      />
      <SandboxNote>Preview of a planned feature — figures are simulated sample data. Financials aren&apos;t in the live product yet.</SandboxNote>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
            <StatCard label="Total Revenue" value={$(M.revenue)} icon="dollar" delta={14.6} />
            <StatCard label="Gross Profit" value={$(M.grossProfit)} icon="analytics" delta={12.1} />
            <StatCard label="Net Profit" value={$(M.net)} icon="growth" delta={9.3} />
            <StatCard label="Expenses" value={$(M.expenses)} icon="payments" delta={6.8} invert />
            <StatCard label="Net Profit Margin" value={`${M.margin.toFixed(1)}%`} icon="gauge" delta={-1.8} />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cream">Profit &amp; Loss Overview</h2>
                {select("year", () => {}, [{ id: "year", label: "This Year" }])}
              </div>
              <div className="mb-2 flex gap-4">
                <LegendDot color={GOLD} label="Revenue" />
                <LegendDot color={GRAY} label="Expenses" />
                <LegendDot dotted label="Net Profit" />
              </div>
              <PnLChart months={M.months} />
            </Panel>

            <Panel className="lg:col-span-2">
              <SectionTitle>Top Income Categories</SectionTitle>
              <ul className="space-y-4">
                {M.income.map((i) => (
                  <li key={i.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-cream/80">{i.name}</span>
                      <span className="flex shrink-0 items-baseline gap-3">
                        <span className="font-medium text-cream">{$(i.value)}</span>
                        <span className="w-11 text-right text-xs text-cream/45">{((i.value / incomeTotal) * 100).toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#eccb7f] to-[#b98a3c]" style={{ width: `${(i.value / incomeMax) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-2">
              <SectionTitle>Expense Breakdown</SectionTitle>
              <MoneyDonut
                segments={M.expenseLines}
                center={
                  <div>
                    <div className="text-base font-semibold text-cream">{$(M.expenses)}</div>
                    <div className="text-[10px] text-cream/45">Total Expenses</div>
                  </div>
                }
              />
              <button onClick={() => toast("Detailed expense report is part of the full release", "info")} className="p-btn-ghost mt-5 w-full justify-center text-xs">
                View Expense Report
              </button>
            </Panel>

            <Panel className="lg:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-cream">Location Performance</h2>
                {select("all", () => {}, [{ id: "all", label: "All Locations" }])}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-cream/40">
                      <th className="pb-2 font-medium">Location</th>
                      <th className="pb-2 font-medium">Revenue</th>
                      <th className="pb-2 font-medium">Net Profit</th>
                      <th className="pb-2 font-medium">Margin</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {M.locations.map((l) => (
                      <tr key={l.name}>
                        <td className="py-2.5 pr-3 text-cream/85">{l.name}</td>
                        <td className="py-2.5 pr-3 text-cream">{$(l.revenue)}</td>
                        <td className="py-2.5 pr-3 text-cream">{$(l.net)}</td>
                        <td className="py-2.5 pr-3 text-cream/70">{l.margin.toFixed(1)}%</td>
                        <td className="py-2.5"><Sparkline data={l.trend} color={GREEN} width={70} height={20} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

        {/* ── Right rail ──────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4">
          <Panel>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-cream">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brass/15 text-brass"><Icon.payments className="h-4 w-4" /></span>
              Cash Summary
            </div>
            <div className="mt-2 text-3xl font-semibold text-cream">{$(M.net)}</div>
            <div className="text-xs text-cream/45">Net Cash Flow</div>
            <div className="mt-3">
              <Sparkline data={[4, 3.4, 4.2, 3.8, 3.2, 4.6, 4.1, 5.6, 6.4]} color={GOLD} width={280} height={44} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-xs">
              <div><div className="text-cream/45">Cash In</div><div className="mt-0.5 font-medium text-emerald-300">{$(M.cashIn)}</div></div>
              <div><div className="text-cream/45">Cash Out</div><div className="mt-0.5 font-medium text-red-300">-{$(M.cashOut)}</div></div>
              <div><div className="text-cream/45">Change</div><div className="mt-0.5 font-medium text-cream">{$(M.cashIn - M.cashOut)}</div></div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Payment Mix</SectionTitle>
            <MoneyDonut
              size={140}
              segments={[
                { label: "Cash", value: M.mix.cash || 1, color: GOLD },
                { label: "Card", value: M.mix.card || 1, color: GOLD_DIM },
                { label: "Mobile", value: M.mix.wallet || 1, color: GRAY_LT },
              ]}
              center={
                <div>
                  <div className="text-[10px] text-cream/45">Total</div>
                  <div className="text-sm font-semibold text-cream">{$(mixTotal)}</div>
                </div>
              }
            />
          </Panel>

          <Panel>
            <SectionTitle right={<button onClick={() => toast("Full transaction history is part of the live feature", "info")} className="text-xs font-semibold text-brass hover:underline">View All</button>}>
              Recent Transactions
            </SectionTitle>
            <ul className="divide-y divide-white/5">
              {M.txs.map((t) => {
                const I = Icon[TX_ICON[t.kind]];
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-cream/60"><I className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-cream/85">{t.title}</span>
                      <span className="block text-[11px] text-cream/40">{t.when}</span>
                    </span>
                    <span className={cx("shrink-0 text-sm font-semibold", t.amount >= 0 ? "text-brass" : "text-red-300")}>
                      {t.amount < 0 ? "-" : ""}{formatMoney(Math.abs(t.amount))}
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
