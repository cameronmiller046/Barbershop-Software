"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, KPI, Money, SectionTitle, Avatar, Tag } from "@/components/demo/ui";
import { BarChart } from "@/components/demo/charts";
import { Icon } from "@/components/home/icons";
import { formatMoney } from "@/lib/utils";
import {
  revenueByMonth, revenueByService, totalRevenue, totalTips, completedCount, commissionOf,
} from "@/lib/demo/metrics";

export default function ReportsPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [range, setRange] = useState<6 | 12>(6);

  const monthly = revenueByMonth(state, range);
  const byService = revenueByService(state);
  const total = totalRevenue(state);
  const completed = completedCount(state);
  const avgTicket = completed ? Math.round(total / completed) : 0;
  const maxSvc = Math.max(1, ...byService.map((s) => s.value));

  const byBarber = state.staff.filter((s) => s.level !== "Owner").map((s) => {
    const c = commissionOf(state, s.id);
    const cuts = completedCount(state, s.id);
    return { s, cuts, revenue: c.serviceCents + c.tipsCents };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <>
      <PageHeader title="Reports" subtitle="Sales performance across your shop."
        actions={<>
          <div className="flex rounded-full border border-white/12 p-0.5 text-xs">
            {[6, 12].map((r) => <button key={r} onClick={() => setRange(r as 6 | 12)} className={`rounded-full px-3 py-1 ${range === r ? "bg-brass/15 text-brass" : "text-cream/55"}`}>{r}mo</button>)}
          </div>
          <Btn onClick={() => toast("Report exported to CSV")}><Icon.reports className="h-4 w-4" /> Export</Btn>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Total revenue" value={<Money cents={total} />} icon="dollar" delta={15} hint="All completed" />
        <KPI label="Avg ticket" value={<Money cents={avgTicket} />} icon="growth" delta={6} hint="Per visit" accent="#34d399" />
        <KPI label="Cuts completed" value={completed} icon="check" delta={9} hint="Lifetime" accent="#38bdf8" />
        <KPI label="Tips collected" value={<Money cents={totalTips(state)} />} icon="loyalty" delta={11} hint="All time" accent="#f472b6" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Tag tone="green">Trending up</Tag>}>Revenue by month</SectionTitle>
          <BarChart data={monthly} money height={220} />
        </Panel>
        <Panel>
          <SectionTitle>Top services</SectionTitle>
          <ul className="space-y-3">
            {byService.slice(0, 6).map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-cream/80">{s.name}</span>
                  <span className="text-cream/60">{formatMoney(s.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#f4d585] to-[#b98a3c]" style={{ width: `${(s.value / maxSvc) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" pad={false}>
        <div className="px-5 pt-4"><SectionTitle>Performance by barber</SectionTitle></div>
        <div className="overflow-x-auto p-scroll">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-white/8 text-left text-xs uppercase tracking-wide text-cream/40">
                <th className="px-5 py-2.5 font-medium">Barber</th>
                <th className="px-5 py-2.5 text-right font-medium">Cuts</th>
                <th className="px-5 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-5 py-2.5 text-right font-medium">Avg ticket</th>
              </tr>
            </thead>
            <tbody>
              {byBarber.map((b) => (
                <tr key={b.s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3"><div className="flex items-center gap-2.5"><Avatar name={b.s.name} color={b.s.color} size={30} /><span className="text-cream">{b.s.name}</span></div></td>
                  <td className="px-5 py-3 text-right text-cream/70">{b.cuts}</td>
                  <td className="px-5 py-3 text-right text-cream/70"><Money cents={b.revenue} /></td>
                  <td className="px-5 py-3 text-right text-cream/70">{b.cuts ? formatMoney(Math.round(b.revenue / b.cuts)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
