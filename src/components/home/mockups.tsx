// Premium product mockups — dark "real app" screens rendered in CSS/SVG.
// Presentational only. Used floating in the hero and in the showcase.

const GOLD = "#d8b25c";
const GOLD_SOFT = "rgba(216,178,92,0.25)";

/* ── shared chart bits ── */
function AreaChart({ className = "" }: { className?: string }) {
  // smooth-ish area path over 12 points
  const pts = [18, 26, 22, 34, 30, 44, 40, 52, 48, 62, 58, 70];
  const w = 300, h = 90, max = 80;
  const step = w / (pts.length - 1);
  const y = (v: number) => h - (v / max) * h;
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ac" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ac)" />
      <path d={line} fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Donut({ size = 62 }: { size?: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const segs = [[0.6, GOLD], [0.25, "#7a5a24"], [0.15, "#39373d"]] as const;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={r} fill="none" stroke="#26242a" strokeWidth="8" />
      {segs.map(([frac, col], i) => {
        const dash = `${(frac * c).toFixed(1)} ${c.toFixed(1)}`;
        const el = <circle key={i} cx="30" cy="30" r={r} fill="none" stroke={col} strokeWidth="8" strokeDasharray={dash} strokeDashoffset={(-off * c).toFixed(1)} transform="rotate(-90 30 30)" strokeLinecap="round" />;
        off += frac; return el;
      })}
    </svg>
  );
}

function Avatar({ label, tone = GOLD }: { label: string; tone?: string }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold" style={{ background: `${tone}22`, color: tone }}>
      {label}
    </span>
  );
}

function WindowChrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 bg-black/40 px-3.5 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-3 truncate rounded-md bg-white/5 px-2.5 py-0.5 text-[10px] text-cream/40">{url}</span>
    </div>
  );
}

/* ── Desktop dashboard ── */
export function DashboardMock() {
  const bookings = [
    ["James Brown", "Haircut", "10:30", "JB"],
    ["Marcus Lee", "Beard Trim", "11:15", "ML"],
    ["Tyler Johnson", "Fade", "1:00", "TJ"],
    ["David Wilson", "Haircut", "2:45", "DW"],
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c0f] text-cream shadow-2xl">
      <WindowChrome url="app.thechair.co/dashboard" />
      <div className="flex">
        <div className="hidden w-12 shrink-0 flex-col items-center gap-4 border-r border-white/10 py-4 sm:flex">
          {["●", "▦", "◷", "☰", "◔"].map((g, i) => (
            <span key={i} className={`text-sm ${i === 0 ? "text-brass" : "text-cream/30"}`}>{g}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Dashboard</div>
            <div className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-cream/40">Today</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Today", "12"], ["Upcoming", "8"], ["Revenue", "$1,250"]].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                <div className="text-[9px] uppercase tracking-wide text-cream/40">{l}</div>
                <div className="mt-0.5 text-base font-bold text-brass">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="mb-1 flex items-center justify-between text-[10px] text-cream/40"><span>Revenue</span><span className="text-emerald-300">▲ 18%</span></div>
              <AreaChart className="h-16 w-full" />
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="mb-1 text-[10px] text-cream/40">Top services</div>
              <div className="flex items-center gap-2">
                <Donut />
                <div className="space-y-1 text-[9px] text-cream/50">
                  <div className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full" style={{ background: GOLD }} /> Haircut 60%</div>
                  <div className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#7a5a24]" /> Beard 25%</div>
                  <div className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#39373d]" /> Other 15%</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
            <div className="mb-1.5 text-[10px] text-cream/40">Recent bookings</div>
            <div className="space-y-1.5">
              {bookings.map(([n, s, t, in_]) => (
                <div key={n} className="flex items-center gap-2">
                  <Avatar label={in_} />
                  <div className="min-w-0 flex-1"><div className="truncate text-[11px]">{n}</div></div>
                  <div className="text-[10px] text-cream/40">{s}</div>
                  <div className="text-[10px] text-brass">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Phone booking ── */
export function PhoneMock() {
  const services = [["Haircut", "$30", "HC"], ["Beard Trim", "$15", "BT"], ["Hair & Beard", "$45", "HB"], ["Kids Cut", "$20", "KC"]];
  return (
    <div className="w-[210px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#0d0c0f] p-2 shadow-2xl" style={{ boxShadow: `0 30px 60px -30px rgba(0,0,0,.8), 0 0 0 1px ${GOLD_SOFT}` }}>
      <div className="overflow-hidden rounded-[1.6rem] border border-white/8">
        <div className="flex items-center justify-between bg-black/40 px-4 pb-2 pt-3">
          <span className="text-[10px] font-semibold text-cream">Book Appointment</span>
          <span className="h-1 w-8 rounded-full bg-white/15" />
        </div>
        <div className="p-3">
          <div className="text-[9px] uppercase tracking-wide text-cream/40">Select a service</div>
          <div className="mt-2 space-y-1.5">
            {services.map(([n, p, in_], i) => (
              <div key={n} className={`flex items-center gap-2 rounded-lg border p-2 ${i === 0 ? "border-brass/50 bg-brass/10" : "border-white/10 bg-white/[0.03]"}`}>
                <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold" style={{ background: `${GOLD}22`, color: GOLD }}>{in_}</span>
                <div className="flex-1 text-[11px] text-cream">{n}</div>
                <div className="text-[11px] font-semibold text-brass">{p}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-full py-2 text-center text-[11px] font-semibold text-[#17130a]" style={{ background: "linear-gradient(180deg,#f4d585,#b98a3c)" }}>Continue</div>
        </div>
      </div>
    </div>
  );
}

/* ── Tablet calendar / scheduling ── */
export function TabletMock() {
  const cols = ["Aaron", "Brandon", "Chris"];
  const blocks = [
    [1, 0, "10:00", GOLD], [3, 1, "11:30", "#7a5a24"], [2, 2, "1:15", GOLD], [5, 0, "2:00", "#39373d"], [4, 2, "3:30", GOLD],
  ] as const;
  return (
    <div className="w-[280px] overflow-hidden rounded-2xl border border-white/12 bg-[#0d0c0f] shadow-2xl">
      <WindowChrome url="Calendar" />
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold text-cream">Wed, Jul 9</div>
          <div className="flex gap-1 text-cream/30">‹ ›</div>
        </div>
        <div className="grid grid-cols-[28px_repeat(3,1fr)] gap-1 text-[8px]">
          <div />
          {cols.map((c) => <div key={c} className="pb-1 text-center text-cream/50">{c}</div>)}
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="contents">
              <div className="pr-1 text-right text-cream/30">{9 + row}:00</div>
              {cols.map((_, col) => {
                const b = blocks.find((x) => x[0] === row && x[1] === col);
                return (
                  <div key={col} className="h-6 rounded border border-white/5 bg-white/[0.02] p-0.5">
                    {b && <div className="flex h-full items-center justify-center rounded text-[7px] text-[#17130a]" style={{ background: b[3] }}>{b[2]}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
