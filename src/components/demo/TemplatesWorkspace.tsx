"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, Modal, EmptyState, SandboxNote, cx } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { TEMPLATE_CATEGORIES, TEMPLATE_VARIABLES, smsSegments } from "@/lib/messageTemplates";
import type { MsgTemplate } from "@/lib/demo/types";

type Filter = "ALL" | "SMS" | "EMAIL";

export function TemplatesWorkspace({ mode }: { mode: "admin" | "barber" }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MsgTemplate | "new" | null>(null);

  const grouped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = state.templates.filter((t) =>
      (filter === "ALL" || t.channel === filter) &&
      (!needle || t.name.toLowerCase().includes(needle) || t.body.toLowerCase().includes(needle)),
    );
    const order = [...TEMPLATE_CATEGORIES] as string[];
    const cats = [...new Set(list.map((t) => t.category))]
      .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    return cats.map((c) => [c, list.filter((t) => t.category === c)] as const);
  }, [state.templates, filter, q]);

  return (
    <>
      <PageHeader
        title="Message Templates"
        subtitle="Reusable SMS and email copy for follow-ups, feedback and win-backs."
        actions={<Btn variant="gold" onClick={() => setEditing("new")}><Icon.plus className="h-4 w-4" /> New template</Btn>}
      />
      <SandboxNote>
        Edit these freely — changes stay in your sandbox and reset on refresh. In the live product
        templates are saved per shop and send over your own Twilio and email accounts.
      </SandboxNote>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "SMS", "EMAIL"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cx("rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                filter === f ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/55 hover:text-cream")}>
              {f === "ALL" ? "All" : f === "SMS" ? "SMS" : "Email"}
            </button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…"
            className="input ml-auto w-full !py-1.5 text-xs sm:w-56" />
          <span className="text-xs text-cream/40">{state.templates.length} total</span>
        </div>
      </Panel>

      {grouped.length === 0 ? (
        <EmptyState icon="messages" title="No templates match" hint="Try a different search or filter." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/35">{category}</h2>
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {items.map((t) => <Card key={t.id} t={t} onEdit={() => setEditing(t)} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <TemplateModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === "new") { actions.addTemplate({ ...data, active: true }); toast("Template created", "success"); }
            else { actions.updateTemplate(editing.id, data); toast("Template saved", "success"); }
            setEditing(null);
          }}
          onDelete={editing !== "new" ? () => {
            actions.deleteTemplate(editing.id);
            toast(`Deleted “${editing.name}”`, "success");
            setEditing(null);
          } : undefined}
        />
      )}
    </>
  );

  function Card({ t, onEdit }: { t: MsgTemplate; onEdit: () => void }) {
    const seg = t.channel === "SMS" ? smsSegments(t.body) : null;
    const used = state.sentMessages.filter((m) => m.templateId === t.id).length;
    return (
      <div className={cx("p-panel flex min-w-0 flex-col p-4", !t.active && "opacity-55")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-cream">{t.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cx("rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                t.channel === "SMS" ? "border-sky-400/30 bg-sky-400/10 text-sky-200" : "border-brass/40 bg-brass/10 text-brass")}>
                {t.channel === "SMS" ? "SMS" : "Email"}
              </span>
              {!t.active && <span className="text-[10px] text-cream/40">Hidden</span>}
              {used > 0 && <span className="text-[10px] text-cream/40">Used {used}×</span>}
            </div>
          </div>
          <button onClick={onEdit} aria-label={`Edit ${t.name}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-cream/50 transition hover:border-brass/40 hover:text-brass">
            <Icon.settings className="h-4 w-4" />
          </button>
        </div>

        {t.subject && <div className="mt-3 truncate text-xs text-cream/60"><span className="text-cream/35">Subject: </span>{t.subject}</div>}
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-cream/55">{t.body}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-cream/35">
          <span>{seg ? `${seg.chars} chars · ${seg.segments} segment${seg.segments === 1 ? "" : "s"}` : "Email"}</span>
          <button onClick={() => actions.updateTemplate(t.id, { active: !t.active })}
            className="font-semibold text-cream/45 transition hover:text-brass">
            {t.active ? "Hide" : "Show"}
          </button>
        </div>
      </div>
    );
  }
}

function TemplateModal({
  initial, onClose, onSave, onDelete,
}: {
  initial: MsgTemplate | null;
  onClose: () => void;
  onSave: (data: Omit<MsgTemplate, "id" | "active">) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [channel, setChannel] = useState<"SMS" | "EMAIL">(initial?.channel ?? "SMS");
  const [category, setCategory] = useState(initial?.category ?? "Follow-up");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const seg = smsSegments(body);

  const save = () => {
    if (!name.trim() || !body.trim()) return;
    onSave({ name: name.trim(), channel, category, subject: channel === "EMAIL" ? subject.trim() || null : null, body: body.trim() });
  };

  return (
    <Modal
      open onClose={onClose} wide
      title={initial ? "Edit template" : "New template"}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {onDelete ? <Btn variant="danger" onClick={onDelete}>Delete</Btn> : <span />}
          <div className="flex gap-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="gold" onClick={save} disabled={!name.trim() || !body.trim()}>Save template</Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Thanks for coming in" /></Field>
          <Field label="Category">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Channel">
          <div className="grid grid-cols-2 gap-2">
            {(["SMS", "EMAIL"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)}
                className={cx("rounded-lg border py-2 text-sm transition",
                  channel === c ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60 hover:text-cream")}>
                {c === "SMS" ? "SMS" : "Email"}
              </button>
            ))}
          </div>
        </Field>

        {channel === "EMAIL" && (
          <Field label="Subject">
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Thanks for visiting {{shop_name}}" />
          </Field>
        )}

        <Field
          label="Message"
          hint={channel === "SMS"
            ? `${seg.chars} characters · ${seg.segments} segment${seg.segments === 1 ? "" : "s"}${seg.segments > 1 ? " — billed as multiple texts" : ""}`
            : "Variables are filled in with the client's details when the message is sent."}
        >
          <textarea className="input resize-y font-mono text-[13px]" rows={channel === "EMAIL" ? 8 : 5}
            value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hey {{client_name}}, thanks for stopping by!" />
        </Field>

        <div>
          <span className="label">Insert a variable</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button key={v.key} type="button" onClick={() => setBody((b) => `${b}{{${v.key}}}`)} title={v.label}
                className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-cream/55 transition hover:border-brass/40 hover:text-brass">
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
