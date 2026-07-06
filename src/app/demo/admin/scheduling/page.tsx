"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Avatar, SandboxNote, Tag } from "@/components/demo/ui";
import { minutesToLabel } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulingPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const barbers = state.staff.filter((s) => s.active && s.level !== "Owner");

  // shifts[staffId][day] = boolean (working). Seed from store hours (closed Sun for some).
  const [shifts, setShifts] = useState<Record<string, boolean[]>>(() => {
    const init: Record<string, boolean[]> = {};
    barbers.forEach((b, bi) => { init[b.id] = DAYS.map((_, d) => d !== 0 && !(d === 1 && bi % 2 === 1)); });
    return init;
  });

  const toggle = (staffId: string, day: number) => {
    setShifts((s) => ({ ...s, [staffId]: s[staffId].map((v, i) => (i === day ? !v : v)) }));
    toast("Shift updated");
  };

  const coverage = DAYS.map((_, d) => barbers.filter((b) => shifts[b.id]?.[d]).length);

  return (
    <>
      <PageHeader title="Scheduling" subtitle="Who's working when. Tap a cell to toggle a shift." />
      <SandboxNote>Draft schedule — changes stay on this screen and reset on refresh.</SandboxNote>

      <Panel pad={false} className="overflow-hidden">
        <div className="overflow-x-auto p-scroll">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[#0f0e11] px-4 py-3 text-left text-xs uppercase tracking-wide text-cream/40">Barber</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="px-2 py-3 text-center text-xs uppercase tracking-wide text-cream/50">
                    {d}<div className="mt-0.5 text-[10px] font-normal text-cream/30">{coverage[i]} on</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barbers.map((b) => (
                <tr key={b.id} className="border-t border-white/6">
                  <td className="sticky left-0 bg-[#0f0e11] px-4 py-3">
                    <div className="flex items-center gap-2.5"><Avatar name={b.name} color={b.color} size={30} /><span className="whitespace-nowrap text-cream">{b.name}</span></div>
                  </td>
                  {DAYS.map((_, d) => {
                    const on = shifts[b.id]?.[d];
                    const h = state.settings.hours[d];
                    return (
                      <td key={d} className="px-1.5 py-2 text-center">
                        <button onClick={() => toggle(b.id, d)}
                          className={`w-full rounded-lg border px-1 py-2 text-[11px] transition ${on ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/8 bg-white/[0.02] text-cream/25"}`}>
                          {on && h.open != null ? `${minutesToLabel(h.open).replace(":00", "")}–${minutesToLabel(h.close ?? 0).replace(":00", "")}` : "Off"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-4 flex flex-wrap gap-2">
        <Tag tone="green">● Working</Tag>
        <Tag tone="neutral">● Off</Tag>
        <span className="text-sm text-cream/40">Total shifts this week: {Object.values(shifts).flat().filter(Boolean).length}</span>
      </div>
    </>
  );
}
