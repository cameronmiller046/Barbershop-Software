"use client";

import { useDemo, staffById } from "@/lib/demo/store";
import { PageHeader, Panel, KPI, Money, SectionTitle, Tag } from "@/components/demo/ui";
import { BarChart } from "@/components/demo/charts";
import { commissionOf, revenueByMonth, completedCount } from "@/lib/demo/metrics";
import { formatMoney } from "@/lib/utils";

export default function CommissionPage() {
  const { state } = useDemo();
  const me = staffById(state, state.currentStaffId)!;
  const c = commissionOf(state, me.id);
  const monthly = revenueByMonth(state, 6, me.id);
  const commissionByMonth = monthly.map((m) => ({ label: m.label, value: Math.round(m.value * (me.commissionRate / 100)) }));
  const cuts = completedCount(state, me.id);
  const takeHome = c.commissionCents + c.tipsCents;

  return (
    <>
      <PageHeader title="Commission" subtitle={`Your earnings at a ${me.commissionRate}% commission split.`} />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Service revenue" value={<Money cents={c.serviceCents} />} icon="scissors" hint="You generated" />
        <KPI label={`Commission (${me.commissionRate}%)`} value={<Money cents={c.commissionCents} />} icon="growth" delta={12} hint="Your cut" accent="#34d399" />
        <KPI label="Tips" value={<Money cents={c.tipsCents} />} icon="loyalty" hint="Kept in full" accent="#f472b6" />
        <KPI label="Take-home" value={<Money cents={takeHome} />} icon="dollar" delta={10} hint="Commission + tips" accent="#38bdf8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Tag tone="green">▲ 12% vs last period</Tag>}>Commission · last 6 months</SectionTitle>
          <BarChart data={commissionByMonth} money height={220} color="#34d399" />
        </Panel>
        <Panel>
          <SectionTitle>This period</SectionTitle>
          <div className="space-y-3 text-sm">
            <Line label="Cuts completed" value={String(cuts)} />
            <Line label="Avg service" value={cuts ? formatMoney(Math.round(c.serviceCents / cuts)) : "—"} />
            <Line label="Commission rate" value={`${me.commissionRate}%`} />
            <div className="h-px bg-white/8" />
            <Line label="Gross commission" value={formatMoney(c.commissionCents)} />
            <Line label="Tips" value={formatMoney(c.tipsCents)} />
            <div className="h-px bg-white/8" />
            <div className="flex items-center justify-between text-base font-semibold"><span className="text-cream">Total take-home</span><span className="text-brass">{formatMoney(takeHome)}</span></div>
          </div>
          <div className="mt-4 rounded-xl border border-brass/20 bg-brass/[0.05] p-3 text-xs text-brass/90">
            Next payout: <span className="font-semibold">Friday</span> · direct deposit
          </div>
        </Panel>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-cream/55">{label}</span><span className="text-cream">{value}</span></div>;
}
