"use client";

import { useDemo, serviceById, customerById } from "@/lib/demo/store";
import { PageHeader, Panel, KPI, Money, SectionTitle, Avatar } from "@/components/demo/ui";
import { ClientButton } from "@/components/demo/ClientProfile";
import { BarChart } from "@/components/demo/charts";
import { totalTips, revenueSeries } from "@/lib/demo/metrics";

export default function TipsPage() {
  const { state } = useDemo();
  const me = state.currentStaffId;

  const tipped = state.appointments
    .filter((a) => a.status === "completed" && a.staffId === me && a.tipCents > 0)
    .sort((a, b) => b.startISO.localeCompare(a.startISO));

  const tips = totalTips(state, me);
  const svcTotal = state.appointments.filter((a) => a.status === "completed" && a.staffId === me).reduce((s, a) => s + a.priceCents, 0);
  const avgPct = svcTotal ? Math.round((tips / svcTotal) * 100) : 0;
  const avgTip = tipped.length ? Math.round(tips / tipped.length) : 0;

  // Tips by weekday (last 30 days) from revenue series' underlying appts
  const series = revenueSeries(state, 14, me);
  const tipByDay = series.map((d) => ({
    label: d.label,
    value: state.appointments.filter((a) => a.status === "completed" && a.staffId === me && new Date(a.startISO).toDateString() === d.date.toDateString()).reduce((s, a) => s + a.tipCents, 0),
  }));

  return (
    <>
      <PageHeader title="Tips" subtitle="Every gratuity, and how it's trending." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Total tips" value={<Money cents={tips} />} icon="loyalty" delta={9} hint="All time" />
        <KPI label="Avg tip" value={<Money cents={avgTip} />} icon="dollar" hint="Per cut" accent="#34d399" />
        <KPI label="Avg tip %" value={`${avgPct}%`} icon="growth" delta={2} hint="Of service" accent="#38bdf8" />
        <KPI label="Tipped cuts" value={tipped.length} icon="check" hint="With gratuity" accent="#f472b6" />
      </div>

      <Panel className="mb-4">
        <SectionTitle>Tips · last 14 days</SectionTitle>
        <BarChart data={tipByDay} money color="#f472b6" height={170} />
      </Panel>

      <Panel pad={false} className="overflow-hidden">
        <div className="px-5 pt-4"><SectionTitle>Recent tips</SectionTitle></div>
        <ul className="divide-y divide-white/6">
          {tipped.map((a) => {
            const c = customerById(state, a.customerId); const v = serviceById(state, a.serviceId);
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={c?.name ?? "?"} size={34} />
                <ClientButton id={a.customerId} className="min-w-0 flex-1"><div className="truncate text-sm text-cream transition hover:text-brass">{c?.name}</div><div className="text-xs text-cream/45">{v?.name} · {new Date(a.startISO).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div></ClientButton>
                <div className="text-right"><div className="font-medium text-brass"><Money cents={a.tipCents} /></div><div className="text-xs text-cream/40">{Math.round((a.tipCents / a.priceCents) * 100)}%</div></div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
