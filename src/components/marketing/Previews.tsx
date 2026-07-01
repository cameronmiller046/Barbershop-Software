import { formatMoney } from "@/lib/utils";
import { GoalBar } from "@/components/charts/GoalBar";
import { BarChart } from "@/components/charts/BarChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { Breakdown } from "@/components/charts/Breakdown";
import { ScissorsIcon } from "@/components/BarberIcons";

/** A macOS-style browser window frame with a barber-striped title bar. */
export function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-charcoal shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-white/10 bg-ink/70 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-barber" />
        <span className="h-3 w-3 rounded-full bg-brass" />
        <span className="h-3 w-3 rounded-full bg-navy" />
        <span className="ml-3 truncate rounded-md bg-white/5 px-3 py-1 text-xs text-cream/40">{url}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ───────── Public booking page ───────── */
export function BookingScreen() {
  const services = [
    { name: "Skin Fade", dur: "40 min", price: "$40" },
    { name: "Cut + Beard", dur: "50 min", price: "$55" },
    { name: "Hot Towel Shave", dur: "30 min", price: "$30" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-brass/25 to-navy/30 p-4">
        <div>
          <div className="font-display text-lg">Professional Barber &amp; Beauty</div>
          <div className="text-xs text-cream/50">Stone Mountain, GA · ★ 4.6</div>
        </div>
        <div className="barber-stripe h-10 w-3 rounded-full" />
      </div>
      <div className="flex gap-2">
        {["Marcus", "Devon", "Jaz"].map((b, i) => (
          <div key={b} className="flex flex-col items-center gap-1">
            <div className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${i === 0 ? "bg-brass text-ink" : "bg-smoke text-cream/70"}`}>{b[0]}</div>
            <span className="text-[10px] text-cream/50">{b}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-ink/50 px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-[11px] text-cream/40">{s.dur} · {s.price}</div>
            </div>
            <span className="rounded-full bg-barber px-3 py-1 text-xs font-semibold text-cream">Book</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Barber portal dashboard ───────── */
export function DashboardScreen() {
  const stats = [
    { label: "Today", value: "8" },
    { label: "Upcoming", value: "23" },
    { label: "This week", value: "$2,480" },
    { label: "Clients", value: "214" },
  ];
  const today = [
    { who: "J. Smith", svc: "Skin Fade", t: "10:00" },
    { who: "A. Brooks", svc: "Cut + Beard", t: "11:30" },
    { who: "S. Rivera", svc: "Hot Towel Shave", t: "1:15" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/10 bg-ink/50 p-2 text-center">
            <div className="text-base font-bold text-brass">{s.value}</div>
            <div className="text-[9px] text-cream/40">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-cream/40">Today&apos;s schedule</div>
      <div className="space-y-1.5">
        {today.map((a) => (
          <div key={a.who} className="flex items-center justify-between rounded-lg border border-white/10 bg-ink/50 px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{a.who}</span>
              <span className="ml-2 text-[11px] text-cream/40">{a.svc}</span>
            </div>
            <span className="text-brass">{a.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Manager reports (real chart components) ───────── */
export function ReportsPreview() {
  const bars = [1520, 1780, 1650, 1990, 2100, 2260, 2050, 2340, 2480, 2610, 2530, 2180]
    .map((v, i, a) => ({ label: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"][i], value: v * 100, highlight: i === a.length - 1 }));
  return (
    <div className="space-y-4">
      <GoalBar earnedCents={218000} goalCents={300000} projectedCents={276000} format={formatMoney} />
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-cream/40">Revenue — last 12 months</div>
        <BarChart bars={bars} goalCents={300000} format={formatMoney} height={150} />
      </div>
    </div>
  );
}

/* ───────── Trend (real SVG line chart) ───────── */
export function TrendPreview() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const pace = days.map((d) => Math.round((300000 * d) / 30));
  const actual = Array.from({ length: 20 }, (_, i) => Math.round(218000 * ((i + 1) / 20) * (0.9 + 0.02 * (i % 3))));
  return <TrendChart days={days} actualCents={actual} goalCents={pace} format={formatMoney} />;
}

/* ───────── Admin analytics (anonymous traffic) ───────── */
export function AnalyticsPreview() {
  const pv = [42, 55, 48, 61, 58, 72, 80, 66, 74, 88, 79, 95].map((v, i) => ({ label: String(i + 1), value: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[["Visitors", "1,240"], ["Pageviews", "3,980"], ["Views/visitor", "3.2"]].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-white/10 bg-ink/50 p-2 text-center">
            <div className="text-base font-bold text-brass">{v}</div>
            <div className="text-[9px] text-cream/40">{l}</div>
          </div>
        ))}
      </div>
      <BarChart bars={pv} format={(n) => String(n)} height={90} />
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cream/40">
          <ScissorsIcon size={14} /> Traffic sources
        </div>
        <Breakdown rows={[{ label: "Google", value: 1240 }, { label: "Instagram", value: 820 }, { label: "Direct", value: 610 }, { label: "Facebook", value: 210 }]} />
      </div>
    </div>
  );
}
