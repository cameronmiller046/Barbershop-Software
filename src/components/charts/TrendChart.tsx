// Server-rendered SVG line chart: cumulative revenue so far this month (solid
// brass + area) against an even "goal pace" line (dashed). No client JS.
export function TrendChart({
  days, actualCents, goalCents, format,
}: {
  days: number[]; // [1..daysInMonth]
  actualCents: number[]; // cumulative, length = days elapsed so far
  goalCents: number[]; // pace target per day, length = daysInMonth
  format: (n: number) => string;
}) {
  const W = 960, H = 420, padL = 96, padR = 28, padT = 28, padB = 56;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = Math.max(1, days.length);
  const max = Math.max(1, ...goalCents, ...actualCents);

  const x = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + (1 - v / max) * plotH;

  const goalPts = goalCents.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const actualPtsArr = actualCents.map((v, i) => [x(i), y(v)] as const);
  const actualPts = actualPtsArr.map(([px, py]) => `${px},${py}`).join(" ");
  const last = actualPtsArr[actualPtsArr.length - 1];
  const baseY = y(0);
  const areaPts = actualPtsArr.length
    ? `${x(0)},${baseY} ${actualPts} ${last[0]},${baseY}`
    : "";

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
  // X ticks: 1, 5, 10, … plus the last day, de-duplicated and in range.
  const tickDays = [...new Set([1, 5, 10, 15, 20, 25, n])].filter((d) => d >= 1 && d <= n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly sales trend">
      {/* horizontal gridlines + y labels */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity={0.08} />
          <text x={padL - 12} y={y(v) + 5} textAnchor="end" fontSize={15} fill="#f5f1e8" fillOpacity={0.45}>
            {format(v)}
          </text>
        </g>
      ))}

      {/* goal pace line (dashed) */}
      <polyline points={goalPts} fill="none" stroke="#f5f1e8" strokeOpacity={0.4} strokeWidth={2} strokeDasharray="7 5" />

      {/* actual: area + line + endpoint */}
      {areaPts && <polygon points={areaPts} fill="#d1233a" fillOpacity={0.16} />}
      {actualPtsArr.length > 1 && (
        <polyline points={actualPts} fill="none" stroke="#d1233a" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {last && (
        <>
          <line x1={last[0]} x2={last[0]} y1={padT} y2={baseY} stroke="#d1233a" strokeOpacity={0.25} />
          <circle cx={last[0]} cy={last[1]} r={6} fill="#d1233a" />
          <text
            x={Math.min(last[0] + 10, W - padR - 4)} y={Math.max(last[1] - 16, padT + 14)}
            textAnchor={last[0] > W - padR - 90 ? "end" : "start"}
            fontSize={17} fontWeight={700} fill="#d1233a"
          >
            {format(actualCents[actualCents.length - 1] ?? 0)}
          </text>
        </>
      )}

      {/* x-axis day labels */}
      {tickDays.map((d) => (
        <text key={d} x={x(d - 1)} y={H - 24} textAnchor="middle" fontSize={14} fill="#f5f1e8" fillOpacity={0.45}>
          {d}
        </text>
      ))}
      <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" fontSize={13} fill="#f5f1e8" fillOpacity={0.35}>
        Day of month
      </text>

      {/* legend */}
      <g transform={`translate(${padL}, ${padT - 8})`}>
        <line x1={0} x2={26} y1={-4} y2={-4} stroke="#d1233a" strokeWidth={3.5} />
        <text x={32} y={0} fontSize={14} fill="#d1233a">Actual</text>
        <line x1={110} x2={136} y1={-4} y2={-4} stroke="#f5f1e8" strokeOpacity={0.4} strokeWidth={2} strokeDasharray="7 5" />
        <text x={142} y={0} fontSize={14} fill="#f5f1e8" fillOpacity={0.55}>Goal pace</text>
      </g>
    </svg>
  );
}
