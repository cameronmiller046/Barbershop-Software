"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStatus, assignTicket, setPriority, setSeverity, setLabels, addAdminComment } from "@/app/admin/dev/actions";
import {
  STATUS_ORDER, STATUS_META, PRIORITY_ORDER, PRIORITY_META, SEVERITY_ORDER, SEVERITY_META,
  SUGGESTED_LABELS,
} from "@/lib/tickets";

type User = { id: string; name: string };

export function TicketControls({
  id, type, status, priority, severity, assigneeId, labels, assignees,
}: {
  id: string; type: string; status: string; priority: string; severity: string | null; assigneeId: string | null; labels: string[]; assignees: User[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [labelState, setLabelState] = useState<string[]>(labels);
  const [labelInput, setLabelInput] = useState("");
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const commitLabels = (next: string[]) => { setLabelState(next); run(() => setLabels(id, next)); };
  const addLabel = (l: string) => { const v = l.trim(); if (v && !labelState.includes(v)) commitLabels([...labelState, v]); setLabelInput(""); };

  return (
    <div className="p-panel space-y-4 p-5">
      <h3 className="font-display text-lg text-cream">Manage</h3>

      <Field label="Status">
        <select value={status} onChange={(e) => run(() => setStatus(id, e.target.value))} className={selCls}>
          {STATUS_ORDER.map((s) => <option key={s} value={s} className="bg-[#131217]">{STATUS_META[s].label}</option>)}
        </select>
      </Field>

      <Field label="Assignee">
        <select value={assigneeId ?? ""} onChange={(e) => run(() => assignTicket(id, e.target.value))} className={selCls}>
          <option value="" className="bg-[#131217]">Unassigned</option>
          {assignees.map((u) => <option key={u.id} value={u.id} className="bg-[#131217]">{u.name}</option>)}
        </select>
      </Field>

      <Field label="Priority">
        <select value={priority} onChange={(e) => run(() => setPriority(id, e.target.value))} className={selCls}>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p} className="bg-[#131217]">{PRIORITY_META[p].label}</option>)}
        </select>
      </Field>

      {type === "BUG" && (
        <Field label="Severity">
          <select value={severity ?? ""} onChange={(e) => run(() => setSeverity(id, e.target.value))} className={selCls}>
            <option value="" className="bg-[#131217]">None</option>
            {SEVERITY_ORDER.map((s) => <option key={s} value={s} className="bg-[#131217]">{SEVERITY_META[s].label}</option>)}
          </select>
        </Field>
      )}

      <div>
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">Labels</span>
        <div className="flex flex-wrap gap-1.5">
          {labelState.map((l) => (
            <span key={l} className="flex items-center gap-1 rounded-full bg-brass/15 px-2.5 py-1 text-xs text-brass">
              {l}<button onClick={() => commitLabels(labelState.filter((x) => x !== l))} className="text-brass/60 hover:text-brass">✕</button>
            </span>
          ))}
        </div>
        <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLabel(labelInput); } }}
          placeholder="Add label + Enter" className={`mt-2 ${selCls}`} list="label-suggestions" />
        <datalist id="label-suggestions">{SUGGESTED_LABELS.map((l) => <option key={l} value={l} />)}</datalist>
      </div>

      <AdminComment id={id} onDone={() => router.refresh()} />
    </div>
  );
}

function AdminComment({ id, onDone }: { id: string; onDone: () => void }) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="border-t border-white/8 pt-4">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">Add a {internal ? "note" : "response"}</span>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={internal ? "Internal dev note (hidden from reporter)…" : "Public response to the reporter…"} className={selCls} />
      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-cream/60"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-[#d8b25c]" /> Internal note</label>
        <button disabled={pending || !body.trim()} onClick={() => start(async () => { await addAdminComment(id, body, internal); setBody(""); onDone(); })} className="p-btn-gold disabled:opacity-50">{pending ? "Posting…" : "Post"}</button>
      </div>
    </div>
  );
}

const selCls = "w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream focus:border-brass/60 focus:outline-none";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] uppercase tracking-wide text-cream/40">{label}</span>{children}</label>;
}
