"use client";

import { useState, useTransition } from "react";
import { addReporterComment } from "@/app/portal/feedback/actions";

export function ReplyBox({ ticketId }: { ticketId: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="p-panel p-4">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add a reply…"
        className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream placeholder:text-cream/25 focus:border-brass/60 focus:outline-none" />
      <div className="mt-2 flex justify-end">
        <button disabled={pending || !body.trim()} onClick={() => start(async () => { await addReporterComment(ticketId, body); setBody(""); })}
          className="p-btn-gold disabled:opacity-50">{pending ? "Sending…" : "Reply"}</button>
      </div>
    </div>
  );
}
