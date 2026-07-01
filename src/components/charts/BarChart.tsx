// Server-rendered vertical bar chart (CSS bars, no client JS). Hover a column
// to see its exact value; the current month is highlighted in brass.
export type Bar = { label: string; value: number; highlight?: boolean };

export function BarChart({
  bars, goalCents, format, height = 220,
}: {
  bars: Bar[];
  goalCents?: number;
  format: (n: number) => string;
  height?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value), goalCents ?? 0) * 1.08;

  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* Goal reference line */}
        {goalCents ? (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-brass/50"
            style={{ bottom: `${(goalCents / max) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] text-brass/70">
              Goal {format(goalCents)}
            </span>
          </div>
        ) : null}

        <div className="flex h-full items-end gap-1.5">
          {bars.map((b, i) => (
            <div
              key={i}
              className="group flex h-full flex-1 flex-col items-center justify-end"
              title={`${b.label}: ${format(b.value)}`}
            >
              <div className="mb-1 text-[10px] tabular-nums text-cream/60 opacity-0 transition-opacity group-hover:opacity-100">
                {format(b.value)}
              </div>
              <div
                className="w-full rounded-t transition-colors group-hover:brightness-110"
                style={{
                  height: `${(b.value / max) * 100}%`,
                  minHeight: b.value > 0 ? 2 : 0,
                  background: b.highlight ? "#d1233a" : "#7f2531",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex gap-1.5">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] ${b.highlight ? "font-medium text-brass" : "text-cream/40"}`}
          >
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}
