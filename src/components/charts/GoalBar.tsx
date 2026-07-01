// Server-rendered goal progress bar: earned vs monthly goal, with a marker
// showing where the month is projected to land (earned + confirmed bookings).
export function GoalBar({
  earnedCents, goalCents, projectedCents, format,
}: {
  earnedCents: number;
  goalCents: number;
  projectedCents: number;
  format: (n: number) => string;
}) {
  if (goalCents <= 0) {
    return (
      <div className="text-sm text-cream/50">
        No monthly goal set yet — add one in <span className="text-brass">Settings</span> to track progress.
      </div>
    );
  }
  const pct = (earnedCents / goalCents) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  const projPct = Math.max(0, Math.min(100, (projectedCents / goalCents) * 100));
  const hit = earnedCents >= goalCents;

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-brass">{format(earnedCents)}</span>
          <span className="ml-2 text-sm text-cream/50">of {format(goalCents)}</span>
        </div>
        <span className={hit ? "text-sm font-medium text-emerald-400" : "text-sm font-medium text-cream/70"}>
          {Math.round(pct)}%{hit ? " · goal hit 🎉" : ""}
        </span>
      </div>

      <div className="relative mt-3 h-4 overflow-hidden rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${clamped}%`, background: hit ? "#34d399" : "#d1233a" }}
        />
        {/* Projected end-of-month marker */}
        {projectedCents > earnedCents && (
          <div
            className="absolute inset-y-0 w-0.5 bg-cream/70"
            style={{ left: `${projPct}%` }}
            title={`Projected end of month: ${format(projectedCents)}`}
          />
        )}
      </div>

      <div className="mt-2 flex justify-between text-xs text-cream/40">
        <span>Projected: <span className="text-cream/70">{format(projectedCents)}</span></span>
        <span>{format(Math.max(0, goalCents - earnedCents))} to go</span>
      </div>
    </div>
  );
}
