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
  const W = 720, H = 260, padL = 56, padR = 10, padT = 12, padB = 34;
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly sales trend">
      {/* horizontal gridlines + y labels */}
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#ffffff" strokeOpacity={0.07} />
          <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#f5f1e8" fillOpacity={0.4}>
            {format(v)}
          </text>
        </g>
      ))}

      {/* goal pace line (dashed) */}
      <polyline points={goalPts} fill="none" stroke="#f5f1e8" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="5 4" />

      {/* actual: area + line + endpoint */}
      {areaPts && <polygon points={areaPts} fill="#c9a24b" fillOpacity={0.14} />}
      {actualPtsArr.length > 1 && (
        <polyline points={actualPts} fill="none" stroke="#c9a24b" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {last && (
        <>
          <line x1={last[0]} x2={last[0]} y1={padT} y2={baseY} stroke="#c9a24b" strokeOpacity={0.25} />
          <circle cx={last[0]} cy={last[1]} r={4} fill="#c9a24b" />
          <text
            x={Math.min(last[0], W - padR - 60)} y={Math.max(last[1] - 10, padT + 10)}
            fontSize={11} fontWeight={600} fill="#c9a24b"
          >
            {format(actualCents[actualCents.length - 1] ?? 0)}
          </text>
        </>
      )}

      {/* x-axis day labels */}
      {[0, Math.floor((n - 1) / 2), n - 1].map((i, k) => (
        <text key={k} x={x(i)} y={H - 12} textAnchor="middle" fontSize={10} fill="#f5f1e8" fillOpacity={0.4}>
          {days[i]}
        </text>
      ))}

      {/* legend */}
      <g transform={`translate(${padL}, ${H - 4})`}>
        <text fontSize={10} fill="#c9a24b">━ Actual</text>
        <text x={70} fontSize={10} fill="#f5f1e8" fillOpacity={0.5}>┄ Goal pace</text>
      </g>
    </svg>
  );
}
