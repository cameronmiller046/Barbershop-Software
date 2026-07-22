"use client";

import { useEffect, useState, useTransition } from "react";
import { clockIn, clockOut, startBreak, endBreak } from "@/app/portal/timeclock/actions";
import { Icon } from "@/components/home/icons";

export function TimeClock({
  openSinceISO,
  todayMinutes,
  onBreakSinceISO,
  shiftBreakMinutes,
}: {
  openSinceISO: string | null;
  todayMinutes: number;
  onBreakSinceISO: string | null;
  shiftBreakMinutes: number;
}) {
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const clockedIn = !!openSinceISO;
  const onBreak = !!onBreakSinceISO;

  // One ticking clock drives both the worked timer and the break timer.
  useEffect(() => {
    if (!clockedIn) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [clockedIn]);

  // Worked time on the open shift = elapsed − all break time (completed + ongoing).
  const ongoingBreakMs = onBreak ? Math.max(0, now - new Date(onBreakSinceISO!).getTime()) : 0;
  const workedMs = clockedIn
    ? Math.max(0, now - new Date(openSinceISO!).getTime() - shiftBreakMinutes * 60_000 - ongoingBreakMs)
    : 0;
  const todayTotalMin = todayMinutes + Math.floor(workedMs / 60_000);

  return (
    <div className="p-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-cream">Time Clock</h3>
        <span
          className={`flex items-center gap-1.5 text-xs ${
            onBreak ? "text-amber-300" : clockedIn ? "text-emerald-300" : "text-cream/40"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              onBreak ? "bg-amber-400" : clockedIn ? "p-live-dot bg-emerald-400" : "bg-cream/30"
            }`}
          />
          {onBreak ? "On break" : clockedIn ? "On the clock" : "Clocked out"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
        {onBreak ? (
          <>
            <BreakTimer since={onBreakSinceISO!} now={now} />
            <div className="mt-1 text-xs text-cream/45">
              Worked {fmtDur(Math.floor(workedMs / 60_000))} · on break since{" "}
              {new Date(onBreakSinceISO!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </div>
          </>
        ) : clockedIn ? (
          <>
            <WorkedTimer ms={workedMs} />
            <div className="mt-1 text-xs text-cream/45">
              since {new Date(openSinceISO!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              {shiftBreakMinutes > 0 && ` · ${fmtDur(shiftBreakMinutes)} break`}
            </div>
          </>
        ) : (
          <>
            <div className="font-display text-3xl font-semibold text-cream/70 tabular-nums">0:00:00</div>
            <div className="mt-1 text-xs text-cream/45">Not clocked in</div>
          </>
        )}
      </div>

      {onBreak ? (
        <div className="mt-4 space-y-2">
          <button
            onClick={() => start(() => endBreak())}
            disabled={pending}
            className="p-btn-gold w-full"
          >
            <Icon.checkin className="h-4 w-4" /> {pending ? "…" : "End Break"}
          </button>
          <button
            onClick={() => start(() => clockOut())}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
          >
            <Icon.logout className="h-4 w-4" /> {pending ? "…" : "Clock Out"}
          </button>
        </div>
      ) : clockedIn ? (
        <div className="mt-4 space-y-2">
          <button
            onClick={() => start(() => clockOut())}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
          >
            <Icon.logout className="h-4 w-4" /> {pending ? "…" : "Clock Out"}
          </button>
          <button
            onClick={() => start(() => startBreak())}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-50"
          >
            <Icon.clock className="h-4 w-4" /> {pending ? "…" : "Take a Break"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => start(() => clockIn())}
          disabled={pending}
          className="p-btn-gold mt-4 w-full"
        >
          <Icon.checkin className="h-4 w-4" /> {pending ? "…" : "Clock In"}
        </button>
      )}

      <div className="mt-3 text-center text-xs text-cream/45">
        Today: <span className="text-cream/70">{fmtDur(todayTotalMin)}</span>
      </div>
    </div>
  );
}

function WorkedTimer({ ms }: { ms: number }) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <div className="font-display text-3xl font-semibold text-brass tabular-nums">
      {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

function BreakTimer({ since, now }: { since: string; now: number }) {
  const ms = Math.max(0, now - new Date(since).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <div className="font-display text-3xl font-semibold text-amber-300 tabular-nums">
      {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}

function fmtDur(min: number) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
