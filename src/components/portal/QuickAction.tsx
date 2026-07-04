"use client";

import { useTransition } from "react";
import { checkInAppointment, startAppointment } from "@/app/portal/actions";
import { Icon } from "@/components/home/icons";

export function QuickAction({ id, state }: { id: string; state: "scheduled" | "checkedin" }) {
  const [pending, start] = useTransition();
  if (state === "scheduled") {
    return (
      <button disabled={pending} onClick={() => start(() => checkInAppointment(id))}
        className="inline-flex items-center gap-1 rounded-full border border-brass/30 bg-brass/[0.06] px-2.5 py-1 text-xs font-medium text-brass transition hover:bg-brass/15 disabled:opacity-50">
        <Icon.checkin className="h-3.5 w-3.5" /> {pending ? "…" : "Check in"}
      </button>
    );
  }
  return (
    <button disabled={pending} onClick={() => start(() => startAppointment(id))}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/[0.08] px-2.5 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-50">
      <Icon.scissors className="h-3.5 w-3.5" /> {pending ? "…" : "Start"}
    </button>
  );
}
