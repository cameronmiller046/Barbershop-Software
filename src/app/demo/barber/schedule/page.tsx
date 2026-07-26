"use client";

import { useDemo, serviceById, customerById } from "@/lib/demo/store";
import { PageHeader, Panel, StatusBadge, Avatar, Money, EmptyState } from "@/components/demo/ui";
import { startOfDay } from "@/lib/demo/metrics";

export default function SchedulePage() {
  const { state } = useDemo();
  const me = state.currentStaffId;
  const from = startOfDay(new Date()).getTime();

  const upcoming = state.appointments
    .filter((a) => a.staffId === me && a.status !== "cancelled" && new Date(a.startISO).getTime() >= from)
    .sort((a, b) => a.startISO.localeCompare(b.startISO));

  // group by day
  const groups = new Map<string, typeof upcoming>();
  for (const a of upcoming) {
    const k = new Date(a.startISO).toDateString();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }

  return (
    <>
      <PageHeader title="My Schedule" subtitle="Everything booked on your chair, day by day." />

      {upcoming.length === 0 ? (
        <EmptyState icon="calendar" title="Nothing booked" hint="Your upcoming chair is clear." />
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([day, appts]) => {
            const d = new Date(day);
            const isToday = d.toDateString() === new Date().toDateString();
            const total = appts.reduce((s, a) => s + (serviceById(state, a.serviceId)?.priceCents ?? 0), 0);
            return (
              <div key={day}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="font-display text-lg text-cream">{isToday ? "Today" : d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2>
                  <span className="text-sm text-cream/40">· {appts.length} appt{appts.length > 1 ? "s" : ""} · <Money cents={total} /></span>
                </div>
                <Panel pad={false} className="overflow-hidden">
                  <ul className="divide-y divide-white/6">
                    {appts.map((a) => {
                      const c = customerById(state, a.customerId); const v = serviceById(state, a.serviceId);
                      return (
                        <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                          <span className="w-16 text-sm font-medium text-brass">{new Date(a.startISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                          <Avatar name={c?.name ?? "?"} size={34} />
                          <div className="min-w-0 flex-1"><div className="truncate text-sm text-cream">{c?.name}</div><div className="text-xs text-cream/45">{v?.name} · {v?.durationMin}m</div></div>
                          <StatusBadge status={a.status} />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
