"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { suggestTimeEdit } from "@/app/portal/timeclock/actions";
import { Icon } from "@/components/home/icons";

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function SuggestTimeEdit({ entryId, clockInISO, clockOutISO, pending }: { entryId: string; clockInISO: string; clockOutISO: string | null; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, start] = useTransition();
  useEffect(() => setMounted(true), []);

  if (pending) return <span className="badge st-checkedin">Edit pending</span>;

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-white/12 px-3 py-1 text-xs text-cream/60 transition hover:border-brass/40 hover:text-brass">Suggest edit</button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131217] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-cream">Suggest a time edit</h3>
              <button onClick={() => setOpen(false)} className="text-cream/40 hover:text-cream">✕</button>
            </div>
            <p className="mt-1 text-sm text-cream/50">Your manager reviews and approves changes.</p>
            <form action={(fd) => start(async () => { await suggestTimeEdit(entryId, fd); setOpen(false); })} className="mt-4 space-y-3">
              <div><label className="label">Clock in</label><input name="clockIn" type="datetime-local" defaultValue={toLocal(clockInISO)} className="input" /></div>
              <div><label className="label">Clock out</label><input name="clockOut" type="datetime-local" defaultValue={toLocal(clockOutISO)} className="input" /></div>
              <div><label className="label">Reason</label><textarea name="reason" required rows={3} placeholder="e.g. Forgot to clock out — left at 6pm." className="input min-h-[72px]" /></div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="p-btn-ghost">Cancel</button>
                <button disabled={submitting} className="p-btn-gold"><Icon.check className="h-4 w-4" /> {submitting ? "Sending…" : "Send to manager"}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
