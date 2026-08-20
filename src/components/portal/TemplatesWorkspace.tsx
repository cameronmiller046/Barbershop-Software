"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/home/icons";
import { TEMPLATE_CATEGORIES, TEMPLATE_VARIABLES, smsSegments } from "@/lib/messageTemplates";
import { createTemplate, updateTemplate, deleteTemplate, toggleTemplate } from "@/app/portal/messageActions";

export type TemplateRow = {
  id: string; name: string; channel: "SMS" | "EMAIL"; category: string;
  subject: string | null; body: string; active: boolean; isSeed: boolean;
};

type Filter = "ALL" | "SMS" | "EMAIL";

export function TemplatesWorkspace({
  rows, canEdit, providers,
}: { rows: TemplateRow[]; canEdit: boolean; providers: { sms: boolean; email: boolean } }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<TemplateRow | "new" | null>(null);

  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) =>
      (filter === "ALL" || r.channel === filter) &&
      (!needle || r.name.toLowerCase().includes(needle) || r.body.toLowerCase().includes(needle)),
    );
    const map = new Map<string, TemplateRow[]>();
    for (const c of TEMPLATE_CATEGORIES) {
      const inCat = list.filter((r) => r.category === c);
      if (inCat.length) map.set(c, inCat);
    }
    // Any category not in the known list (legacy/hand-edited rows) still shows.
    for (const r of list) if (!map.has(r.category)) map.set(r.category, list.filter((x) => x.category === r.category));
    return [...map.entries()];
  }, [rows, filter, q]);

  const missingProvider = !providers.sms || !providers.email;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-cream sm:text-3xl">Message Templates</h1>
          <p className="mt-1 text-sm text-cream/50">Reusable SMS and email copy for follow-ups, feedback and win-backs.</p>
        </div>
        {canEdit && (
          <button onClick={() => setEditing("new")} className="p-btn-gold"><Icon.plus className="h-4 w-4" /> New Template</button>
        )}
      </div>

      {missingProvider && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brass/25 bg-brass/[0.06] px-4 py-2.5 text-xs text-brass/90">
          <Icon.shield className="h-4 w-4 shrink-0" />
          <span>
            {!providers.sms && !providers.email
              ? "No SMS or email provider is connected yet — messages will be logged instead of delivered."
              : !providers.sms
                ? "Twilio isn't connected — texts will be logged instead of delivered."
                : "No email provider is connected — emails will be logged instead of delivered."}
          </span>
          <a href="/portal/settings" className="font-semibold underline hover:no-underline">Connect in Settings</a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "SMS", "EMAIL"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${filter === f ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/55 hover:text-cream"}`}>
            {f === "ALL" ? "All" : f === "SMS" ? "SMS" : "Email"}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…"
          className="input ml-auto w-full !py-2 text-sm sm:w-64" />
      </div>

      {grouped.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-cream/40"><Icon.messages className="h-6 w-6" /></span>
          <div className="text-cream/80">No templates match</div>
          <div className="mt-1 text-sm text-cream/40">Try a different search or filter.</div>
        </div>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/35">{category}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((t) => <Card key={t.id} t={t} canEdit={canEdit} onEdit={() => setEditing(t)} />)}
            </div>
          </section>
        ))
      )}

      {editing && (
        <TemplateModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Card({ t, canEdit, onEdit }: { t: TemplateRow; canEdit: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const seg = t.channel === "SMS" ? smsSegments(t.body) : null;
  return (
    <div className={`p-panel flex min-w-0 flex-col p-4 ${t.active ? "" : "opacity-55"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-cream">{t.name}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${t.channel === "SMS" ? "border-sky-400/30 bg-sky-400/10 text-sky-200" : "border-brass/40 bg-brass/10 text-brass"}`}>
              {t.channel === "SMS" ? "SMS" : "Email"}
            </span>
            {!t.active && <span className="text-[10px] text-cream/40">Hidden</span>}
          </div>
        </div>
        {canEdit && (
          <button onClick={onEdit} aria-label={`Edit ${t.name}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-cream/50 transition hover:border-brass/40 hover:text-brass">
            <Icon.settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {t.subject && <div className="mt-3 truncate text-xs text-cream/60"><span className="text-cream/35">Subject: </span>{t.subject}</div>}
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-cream/55">{t.body}</p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-cream/35">
        <span>{seg ? `${seg.chars} chars · ${seg.segments} segment${seg.segments === 1 ? "" : "s"}` : "Email"}</span>
        {canEdit && (
          <button
            disabled={pending}
            onClick={() => start(() => { void toggleTemplate(t.id, !t.active); })}
            className="font-semibold text-cream/45 transition hover:text-brass disabled:opacity-50">
            {t.active ? "Hide" : "Show"}
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateModal({ initial, onClose }: { initial: TemplateRow | null; onClose: () => void }) {
  const [channel, setChannel] = useState<"SMS" | "EMAIL">(initial?.channel ?? "SMS");
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, start] = useTransition();
  const seg = smsSegments(body);

  const insertVar = (key: string) => setBody((b) => `${b}{{${key}}}`);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#131217] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <h3 className="font-display text-lg text-cream">{initial ? "Edit template" : "New template"}</h3>
          <button onClick={onClose} className="text-cream/40 hover:text-cream">✕</button>
        </div>

        <form
          action={(fd) => start(async () => {
            if (initial) await updateTemplate(initial.id, fd);
            else await createTemplate(fd);
            onClose();
          })}
          className="p-scroll max-h-[70vh] space-y-4 overflow-y-auto p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Name</span>
              <input name="name" required defaultValue={initial?.name ?? ""} placeholder="Thanks for coming in" className="input" />
            </label>
            <label className="block">
              <span className="label">Category</span>
              <select name="category" defaultValue={initial?.category ?? "Follow-up"} className="input">
                {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div>
            <span className="label">Channel</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["SMS", "EMAIL"] as const).map((c) => (
                <button key={c} type="button" onClick={() => setChannel(c)}
                  className={`rounded-lg border py-2 text-sm transition ${channel === c ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60 hover:text-cream"}`}>
                  {c === "SMS" ? "SMS" : "Email"}
                </button>
              ))}
            </div>
            <input type="hidden" name="channel" value={channel} />
          </div>

          {channel === "EMAIL" && (
            <label className="block">
              <span className="label">Subject</span>
              <input name="subject" defaultValue={initial?.subject ?? ""} placeholder="Thanks for visiting {{shop_name}}" className="input" />
            </label>
          )}

          <label className="block">
            <span className="label">Message</span>
            <textarea name="body" required rows={channel === "EMAIL" ? 9 : 5} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Hey {{client_name}}, thanks for stopping by!" className="input resize-y font-mono text-[13px]" />
          </label>

          {channel === "SMS" && (
            <div className="flex items-center gap-2 text-[11px] text-cream/45">
              <span>{seg.chars} characters · {seg.segments} segment{seg.segments === 1 ? "" : "s"}</span>
              {seg.unicode && <span className="text-brass/80">Unicode — 70 chars per segment</span>}
              {seg.segments > 1 && <span className="text-brass/80">Billed as {seg.segments} texts</span>}
            </div>
          )}

          <div>
            <span className="label">Insert a variable</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button key={v.key} type="button" onClick={() => insertVar(v.key)} title={v.label}
                  className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-cream/55 transition hover:border-brass/40 hover:text-brass">
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-cream/35">Variables are filled in with the client&apos;s details when the message is sent.</p>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/8 pt-4">
            {initial ? (
              <button type="button" disabled={pending}
                onClick={() => start(async () => { await deleteTemplate(initial.id); onClose(); })}
                className="rounded-full border border-red-400/40 px-4 py-1.5 text-sm text-red-200 transition hover:bg-red-400/10 disabled:opacity-50">
                Delete
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="p-btn-ghost">Cancel</button>
              <button disabled={pending} className="p-btn-gold disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
