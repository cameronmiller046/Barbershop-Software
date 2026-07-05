"use client";

import { useEffect, useState, useTransition } from "react";
import { clockIn, clockOut } from "@/app/portal/timeclock/actions";
import { Icon } from "@/components/home/icons";

export function TimeClock({ openSinceISO, todayMinutes }: { openSinceISO: string | null; todayMinutes: number }) {
  const [pending, start] = useTransition();
  const clockedIn = !!openSinceISO;

  return (
    <div className="p-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-cream">Time Clock</h3>
        <span className={`flex items-center gap-1.5 text-xs ${clockedIn ? "text-emerald-300" : "text-cream/40"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${clockedIn ? "p-live-dot bg-emerald-400" : "bg-cream/30"}`} />
          {clockedIn ? "On the clock" : "Clocked out"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
        {clockedIn ? (
          <>
            <Elapsed since={openSinceISO!} />
            <div className="mt-1 text-xs text-cream/45">since {new Date(openSinceISO!).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
          </>
        ) : (
          <>
            <div className="font-display text-3xl font-semibold text-cream/70 tabular-nums">0:00:00</div>
            <div className="mt-1 text-xs text-cream/45">Not clocked in</div>
          </>
        )}
      </div>

      <button
        onClick={() => start(() => (clockedIn ? clockOut() : clockIn()))}
        disabled={pending}
        className={`mt-4 w-full ${clockedIn
          ? "inline-flex items-center justify-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
          : "p-btn-gold"}`}
      >
        {clockedIn ? <><Icon.logout className="h-4 w-4" /> {pending ? "…" : "Clock Out"}</> : <><Icon.checkin className="h-4 w-4" /> {pending ? "…" : "Clock In"}</>}
      </button>

      <div className="mt-3 text-center text-xs text-cream/45">Today: <span className="text-cream/70">{fmtDur(todayMinutes + (clockedIn ? liveMinutes(openSinceISO!) : 0))}</span></div>
    </div>
  );
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, now - new Date(since).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return <div className="font-display text-3xl font-semibold text-brass tabular-nums">{h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>;
}

function liveMinutes(since: string) { return Math.floor((Date.now() - new Date(since).getTime()) / 60_000); }
function fmtDur(min: number) { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h ${m}m` : `${m}m`; }
