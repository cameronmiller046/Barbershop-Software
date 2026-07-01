// Horizontal proportion bars for categorical breakdowns (sources, devices,
// top pages, top shops). Server-rendered, no client JS.
export type BreakdownRow = { label: string; value: number };

export function Breakdown({
  rows, format, emptyLabel = "No data yet.",
}: {
  rows: BreakdownRow[];
  format?: (n: number) => string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) return <div className="text-sm text-cream/50">{emptyLabel}</div>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const fmt = format ?? ((n: number) => n.toLocaleString());

  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-cream/80">{r.label}</span>
            <span className="tabular-nums text-cream/50">
              {fmt(r.value)} <span className="text-cream/30">· {Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "#d1233a" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
