"use client";

import { useDemo } from "@/lib/demo/store";
import { PageHeader, Panel, KPI, Money, SectionTitle, Tag } from "@/components/demo/ui";
import { Donut } from "@/components/demo/charts";
import { totalRevenue, totalTips, commissionOf } from "@/lib/demo/metrics";

export default function FinancialsPage() {
  const { state } = useDemo();

  const serviceRev = totalRevenue(state) - totalTips(state);
  const tips = totalTips(state);
  const retail = 184300; // simulated product sales
  const revenue = serviceRev + retail;

  const labor = state.staff.filter((s) => s.level !== "Owner").reduce((sum, s) => sum + commissionOf(state, s.id).commissionCents, 0);
  const productCost = Math.round(retail * 0.42);
  const rent = 340000;
  const supplies = 46000;
  const marketing = 28000;
  const expenses = labor + productCost + rent + supplies + marketing;
  const net = revenue - expenses;
  const margin = revenue ? Math.round((net / revenue) * 100) : 0;

  // Payment mix from completed appointments
  const mix = { card: 0, cash: 0, wallet: 0 };
  for (const a of state.appointments) if (a.status === "completed" && a.paymentMethod) mix[a.paymentMethod] += a.priceCents + a.tipCents;

  const lines = [
    { label: "Service revenue", value: serviceRev, kind: "in" as const },
    { label: "Retail / product sales", value: retail, kind: "in" as const },
    { label: "Tips (pass-through)", value: tips, kind: "in" as const },
    { label: "Labor & commission", value: -labor, kind: "out" as const },
    { label: "Product cost of goods", value: -productCost, kind: "out" as const },
    { label: "Rent & utilities", value: -rent, kind: "out" as const },
    { label: "Supplies", value: -supplies, kind: "out" as const },
    { label: "Marketing", value: -marketing, kind: "out" as const },
  ];

  return (
    <>
      <PageHeader title="Financials" subtitle="Profit & loss overview for the current period." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Revenue" value={<Money cents={revenue} />} icon="dollar" delta={14} hint="Services + retail" />
        <KPI label="Expenses" value={<Money cents={expenses} />} icon="gauge" delta={6} hint="All costs" accent="#f472b6" />
        <KPI label="Net profit" value={<Money cents={net} />} icon="growth" delta={margin} hint="Bottom line" accent={net >= 0 ? "#34d399" : "#ef4444"} />
        <KPI label="Profit margin" value={`${margin}%`} icon="analytics" delta={3} hint="Net / revenue" accent="#38bdf8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Tag tone={net >= 0 ? "green" : "red"}>{net >= 0 ? "Profitable" : "Loss"}</Tag>}>Profit & loss</SectionTitle>
          <ul className="divide-y divide-white/6">
            {lines.map((l) => (
              <li key={l.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2 text-cream/75">
                  <span className={`h-2 w-2 rounded-full ${l.kind === "in" ? "bg-emerald-400" : "bg-red-400/70"}`} />{l.label}
                </span>
                <span className={l.kind === "in" ? "text-cream" : "text-red-200"}>{l.value < 0 ? "−" : ""}<Money cents={Math.abs(l.value)} /></span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-semibold">
              <span className="text-cream">Net profit</span>
              <span className={net >= 0 ? "text-brass" : "text-red-300"}><Money cents={net} /></span>
            </li>
          </ul>
        </Panel>

        <Panel>
          <SectionTitle>Payment mix</SectionTitle>
          <Donut
            segments={[
              { label: "Card", value: mix.card || 1, color: "#d8b25c" },
              { label: "Cash", value: mix.cash || 1, color: "#34d399" },
              { label: "Wallet", value: mix.wallet || 1, color: "#38bdf8" },
            ]}
            center={<div><div className="text-[10px] text-cream/45">Collected</div><div className="text-sm font-semibold text-cream"><Money cents={mix.card + mix.cash + mix.wallet} /></div></div>}
          />
          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-cream/60">
            Cash flow is healthy — {margin}% net margin this period, {margin >= 15 ? "above" : "below"} the 15% industry benchmark.
          </div>
        </Panel>
      </div>
    </>
  );
}
