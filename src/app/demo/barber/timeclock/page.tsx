"use client";

import { useDemo, openTimeEntry } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, KPI, SectionTitle } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";

function fmtDur(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export default function TimeclockPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const me = state.currentStaffId;
  const open = openTimeEntry(state, me);

  const entries = state.timeEntries
    .filter((t) => t.staffId === me)
    .sort((a, b) => b.clockInISO.localeCompare(a.clockInISO));

  const totalMs = entries.reduce((sum, t) => {
    const end = t.clockOutISO ? new Date(t.clockOutISO).getTime() : Date.now();
    return sum + (end - new Date(t.clockInISO).getTime());
  }, 0);
  const shifts = entries.filter((t) => t.clockOutISO).length + (open ? 1 : 0);

  return (
    <>
      <PageHeader title="Time Clock" subtitle="Clock in and out. Managers approve any edits." />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Panel className="flex flex-col items-center justify-center py-10 text-center">
          <span className={`mb-4 grid h-20 w-20 place-items-center rounded-full ${open ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-cream/50"}`}>
            <Icon.clock className="h-10 w-10" />
          </span>
          {open ? (
            <>
              <div className="text-sm text-cream/50">Clocked in since</div>
              <div className="font-display text-2xl text-cream">{new Date(open.clockInISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
              <div className="mt-1 text-sm text-emerald-300">{fmtDur(Date.now() - new Date(open.clockInISO).getTime())} on shift</div>
              <Btn variant="gold" className="mt-5" onClick={() => { actions.clockOut(open.id); toast("Clocked out"); }}>Clock out</Btn>
            </>
          ) : (
            <>
              <div className="font-display text-xl text-cream">You&apos;re clocked out</div>
              <div className="mt-1 text-sm text-cream/45">Start your shift when you&apos;re ready.</div>
              <Btn variant="gold" className="mt-5" onClick={() => { actions.clockIn(me); toast("Clocked in"); }}>Clock in</Btn>
            </>
          )}
        </Panel>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <KPI label="Hours logged" value={fmtDur(totalMs)} icon="clock" hint="This period" />
            <KPI label="Shifts" value={shifts} icon="calendar" hint="Recorded" accent="#34d399" />
          </div>
          <Panel pad={false} className="overflow-hidden">
            <div className="px-4 pt-3"><SectionTitle>Recent shifts</SectionTitle></div>
            <div className="overflow-x-auto p-scroll">
              <table className="w-full min-w-[340px] text-sm">
                <thead>
                  <tr className="border-y border-white/8 text-left text-xs uppercase tracking-wide text-cream/40">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">In</th>
                    <th className="px-3 py-2 font-medium">Out</th>
                    <th className="px-3 py-2 text-right font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((t) => {
                    const end = t.clockOutISO ? new Date(t.clockOutISO).getTime() : Date.now();
                    const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—");
                    return (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="px-3 py-2.5 text-cream/70">{new Date(t.clockInISO).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</td>
                        <td className="px-3 py-2.5 text-cream/70">{fmt(t.clockInISO)}</td>
                        <td className="px-3 py-2.5">{t.clockOutISO ? <span className="text-cream/70">{fmt(t.clockOutISO)}</span> : <span className="text-emerald-300">On shift</span>}</td>
                        <td className="px-3 py-2.5 text-right text-cream/70">{fmtDur(end - new Date(t.clockInISO).getTime())}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
