"use client";

import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, KPI, Money, Avatar, SandboxNote, SectionTitle } from "@/components/demo/ui";
import { commissionOf } from "@/lib/demo/metrics";
import type { DemoState } from "@/lib/demo/types";

function hoursWorked(state: DemoState, staffId: string): number {
  const now = Date.now();
  return state.timeEntries
    .filter((t) => t.staffId === staffId)
    .reduce((sum, t) => {
      const end = t.clockOutISO ? new Date(t.clockOutISO).getTime() : now;
      return sum + Math.max(0, end - new Date(t.clockInISO).getTime());
    }, 0) / 3_600_000;
}

export default function PayrollPage() {
  const { state } = useDemo();
  const { toast } = useToast();

  const rows = state.staff.filter((s) => s.active && s.level !== "Owner").map((s) => {
    const hrs = hoursWorked(state, s.id);
    const comm = commissionOf(state, s.id);
    const wage = Math.round(hrs * s.hourlyCents);
    const gross = wage + comm.commissionCents + comm.tipsCents;
    return { staff: s, hrs, wageCents: wage, commissionCents: comm.commissionCents, tipsCents: comm.tipsCents, grossCents: gross };
  });

  const totalGross = rows.reduce((s, r) => s + r.grossCents, 0);
  const totalHours = rows.reduce((s, r) => s + r.hrs, 0);
  const totalComm = rows.reduce((s, r) => s + r.commissionCents, 0);

  return (
    <>
      <PageHeader title="Payroll" subtitle="Current pay period · commission + hourly + tips."
        actions={<Btn variant="gold" onClick={() => toast("Payroll run — pay stubs generated", "success")}><span>Run payroll</span></Btn>} />

      <SandboxNote>This is a simulated pay run. No payments are processed and no employee records change.</SandboxNote>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPI label="Gross payroll" value={<Money cents={totalGross} />} icon="dollar" hint="This period" />
        <KPI label="Hours" value={totalHours.toFixed(1)} icon="clock" hint="Total logged" accent="#38bdf8" />
        <KPI label="Commission" value={<Money cents={totalComm} />} icon="growth" hint="Across team" accent="#f472b6" />
        <KPI label="Headcount" value={rows.length} icon="staff" hint="On payroll" accent="#34d399" />
      </div>

      <Panel pad={false} className="overflow-hidden">
        <SectionTitle right={<span className="pr-1 text-xs text-cream/40">Bi-weekly</span>}><span className="px-4 pt-3">Pay period breakdown</span></SectionTitle>
        <div className="overflow-x-auto p-scroll">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-white/8 text-left text-xs uppercase tracking-wide text-cream/40">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 text-right font-medium">Hours</th>
                <th className="px-4 py-2.5 text-right font-medium">Base wage</th>
                <th className="px-4 py-2.5 text-right font-medium">Commission</th>
                <th className="px-4 py-2.5 text-right font-medium">Tips</th>
                <th className="px-4 py-2.5 text-right font-medium">Gross pay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.staff.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.staff.name} color={r.staff.color} size={32} />
                      <div>
                        <div className="text-cream">{r.staff.name}</div>
                        <div className="text-xs text-cream/40">{r.staff.level} · {r.staff.commissionRate}% comm</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-cream/70">{r.hrs.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-cream/70"><Money cents={r.wageCents} /></td>
                  <td className="px-4 py-3 text-right text-cream/70"><Money cents={r.commissionCents} /></td>
                  <td className="px-4 py-3 text-right text-cream/70"><Money cents={r.tipsCents} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-brass"><Money cents={r.grossCents} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-4 py-3 font-medium text-cream">Total</td>
                <td className="px-4 py-3 text-right text-cream/70">{totalHours.toFixed(1)}</td>
                <td />
                <td className="px-4 py-3 text-right text-cream/70"><Money cents={totalComm} /></td>
                <td className="px-4 py-3 text-right text-cream/70"><Money cents={rows.reduce((s, r) => s + r.tipsCents, 0)} /></td>
                <td className="px-4 py-3 text-right font-semibold text-brass"><Money cents={totalGross} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}
