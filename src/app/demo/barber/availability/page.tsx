"use client";

import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, SectionTitle } from "@/components/demo/ui";
import { minutesToHHMM, dayName } from "@/lib/utils";

export default function AvailabilityPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const hours = state.availability.hours;
  const parseMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

  const totalHrs = hours.reduce((s, h) => s + (h.open != null && h.close != null ? (h.close - h.open) / 60 : 0), 0);

  return (
    <>
      <PageHeader title="Availability" subtitle="Set the hours you're open for bookings each week." />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <SectionTitle right={<span className="text-xs text-cream/40">{totalHrs.toFixed(0)} hrs/week</span>}>Weekly hours</SectionTitle>
          <div className="space-y-2">
            {hours.map((h, d) => {
              const off = h.open == null;
              return (
                <div key={d} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                  <span className="w-24 text-sm text-cream">{dayName(d)}</span>
                  <button
                    onClick={() => { actions.setDayHours("availability", d, off ? { open: 540, close: 1020 } : { open: null, close: null }); toast(off ? "Marked available" : "Marked off"); }}
                    className={`rounded-full border px-3 py-1 text-xs ${off ? "border-white/12 text-cream/40" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"}`}>
                    {off ? "Off" : "Working"}
                  </button>
                  {!off && (
                    <div className="ml-auto flex items-center gap-2">
                      <input type="time" defaultValue={minutesToHHMM(h.open!)} onChange={(e) => actions.setDayHours("availability", d, { open: parseMin(e.target.value), close: h.close })} className="rounded-lg border border-white/10 bg-smoke px-2 py-1 text-sm text-cream" />
                      <span className="text-cream/40">–</span>
                      <input type="time" defaultValue={minutesToHHMM(h.close ?? 0)} onChange={(e) => actions.setDayHours("availability", d, { open: h.open, close: parseMin(e.target.value) })} className="rounded-lg border border-white/10 bg-smoke px-2 py-1 text-sm text-cream" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end"><Btn variant="gold" onClick={() => toast("Availability saved to sandbox")}>Save availability</Btn></div>
        </Panel>

        <Panel>
          <SectionTitle>Time off</SectionTitle>
          <p className="text-sm text-cream/55">Need a day off? Block it here and the calendar stops taking bookings.</p>
          <div className="mt-3 space-y-2">
            {[["Jul 14", "Vacation"], ["Aug 2", "Personal"]].map(([d, r]) => (
              <div key={d} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm">
                <span className="text-cream">{d}</span><span className="text-cream/45">{r}</span>
              </div>
            ))}
          </div>
          <Btn className="mt-3 w-full" onClick={() => toast("Time-off request submitted")}>Request time off</Btn>
        </Panel>
      </div>
    </>
  );
}
