"use client";

import { useDemo } from "@/lib/demo/store";
import { PageHeader, Panel, KPI, SectionTitle, Tag } from "@/components/demo/ui";
import { AreaChart, BarChart, Donut } from "@/components/demo/charts";
import { minutesToLabel } from "@/lib/utils";

export default function AnalyticsPage() {
  const { state } = useDemo();

  // Busiest hours — derived from real appointment start times in the sandbox.
  const hourBuckets = new Map<number, number>();
  for (const a of state.appointments) {
    if (a.status === "cancelled") continue;
    const h = new Date(a.startISO).getHours();
    hourBuckets.set(h, (hourBuckets.get(h) ?? 0) + 1);
  }
  const hours = Array.from({ length: 11 }, (_, i) => 9 + i).map((h) => ({ label: minutesToLabel(h * 60).replace(":00", ""), value: hourBuckets.get(h) ?? 0 }));

  // New vs returning (visits>1 = returning)
  const returning = state.customers.filter((c) => c.visits > 1).length;
  const neu = state.customers.length - returning;

  // Synthetic-but-deterministic traffic series (bookings drive it).
  const traffic = Array.from({ length: 14 }, (_, i) => ({ label: `${i + 1}`, value: 40 + ((i * 37) % 60) + (i % 3) * 12 }));

  const funnel = [
    { label: "Site visits", value: 1240, color: "#d8b25c" },
    { label: "Booking started", value: 486, color: "#38bdf8" },
    { label: "Booking completed", value: 312, color: "#34d399" },
  ];
  const maxFunnel = funnel[0].value;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Traffic, engagement and retention — privacy-first, cookieless." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Site visits (30d)" value="1,240" icon="activity" delta={18} hint="Unique visitors" />
        <KPI label="Booking rate" value="25.2%" icon="growth" delta={4} hint="Visit → booking" accent="#34d399" />
        <KPI label="Returning clients" value={`${Math.round((returning / Math.max(1, state.customers.length)) * 100)}%`} icon="loyalty" delta={7} hint="Of client base" accent="#f472b6" />
        <KPI label="Avg rating" value="4.9" icon="star" delta={1} hint="Across reviews" accent="#38bdf8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle right={<Tag tone="green">▲ 18%</Tag>}>Visitors · last 14 days</SectionTitle>
          <AreaChart data={traffic} money={false} color="#38bdf8" />
        </Panel>
        <Panel>
          <SectionTitle>New vs returning</SectionTitle>
          <Donut
            segments={[{ label: "Returning", value: returning, color: "#d8b25c" }, { label: "New", value: neu, color: "#34d399" }]}
            center={<div><div className="text-lg font-semibold text-cream">{state.customers.length}</div><div className="text-[10px] text-cream/45">clients</div></div>}
          />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle>Busiest hours</SectionTitle>
          <BarChart data={hours} color="#a855f7" height={190} />
        </Panel>
        <Panel>
          <SectionTitle>Booking funnel</SectionTitle>
          <ul className="mt-2 space-y-3">
            {funnel.map((f) => (
              <li key={f.label}>
                <div className="mb-1 flex items-center justify-between text-sm"><span className="text-cream/80">{f.label}</span><span className="text-cream/60">{f.value.toLocaleString()}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${(f.value / maxFunnel) * 100}%`, background: f.color }} /></div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-cream/60">
            <span className="text-cream">63%</span> of visitors who start a booking finish it — up 4 points this month.
          </div>
        </Panel>
      </div>
    </>
  );
}
