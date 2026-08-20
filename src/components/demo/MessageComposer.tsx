"use client";

/**
 * Sandbox message composer. Mirrors the live portal composer, but nothing is
 * delivered — the message is rendered with the client's real sandbox details
 * and recorded in demo state so the Templates page can show usage counts.
 */

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Modal, Btn, Field, cx } from "@/components/demo/ui";
import { renderTemplate, smsSegments, withOptOut, TEMPLATE_VARIABLES } from "@/lib/messageTemplates";
import type { Customer } from "@/lib/demo/types";

export function MessageComposer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [channel, setChannel] = useState<"SMS" | "EMAIL">(customer.phone ? "SMS" : "EMAIL");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  const templates = state.templates.filter((t) => t.active && t.channel === channel);
  const to = channel === "SMS" ? customer.phone : customer.email;

  // Variable values for this client — same keys the live product fills in.
  const vars = useMemo(() => {
    const acting = state.staff.find((s) => s.id === state.currentStaffId) ?? state.staff[0];
    const mine = state.appointments
      .filter((a) => a.customerId === customer.id && a.status === "completed")
      .sort((a, b) => b.startISO.localeCompare(a.startISO));
    const last = mine[0];
    const next = state.appointments
      .filter((a) => a.customerId === customer.id && (a.status === "scheduled" || a.status === "confirmed"))
      .sort((a, b) => a.startISO.localeCompare(b.startISO))[0];
    const svcName = (id?: string) => state.services.find((v) => v.id === id)?.name ?? "";
    const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");
    const dt = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
    return {
      client_name: customer.name.split(" ")[0],
      shop_name: state.settings.name.replace(" — Flagship", ""),
      barber_name: (acting?.name ?? "").split(" ")[0],
      last_service: svcName(last?.serviceId),
      last_visit: d(last?.startISO),
      next_visit: dt(next?.startISO),
      booking_link: "thechair.app/book",
      shop_phone: state.settings.phone,
    };
  }, [state, customer]);

  const renderedBody = renderTemplate(body, vars);
  const renderedSubject = renderTemplate(subject, vars);
  const finalBody = channel === "SMS" ? withOptOut(renderedBody) : renderedBody;
  const seg = smsSegments(finalBody);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = state.templates.find((x) => x.id === id);
    if (!t) return;
    setBody(t.body);
    setSubject(t.subject ?? "");
  };

  const send = () => {
    if (!to || !body.trim()) return;
    actions.logMessage({
      customerId: customer.id, channel, toAddress: to,
      subject: channel === "EMAIL" ? renderedSubject : null,
      body: finalBody, templateId: templateId || null,
    });
    toast(`${channel === "SMS" ? "Text" : "Email"} sent to ${customer.name} (simulated)`, "success");
    onClose();
  };

  return (
    <Modal
      open onClose={onClose} wide
      title={`Message ${customer.name}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="gold" onClick={send} disabled={!to || !body.trim()}>
            {channel === "SMS" ? "Send text" : "Send email"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["SMS", "EMAIL"] as const).map((c) => {
            const disabled = c === "SMS" ? !customer.phone : !customer.email;
            return (
              <button key={c} type="button" disabled={disabled}
                onClick={() => { setChannel(c); setTemplateId(""); }}
                className={cx("rounded-lg border py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                  channel === c ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60 hover:text-cream")}>
                {c === "SMS" ? "Text message" : "Email"}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-brass/20 bg-brass/[0.06] px-3.5 py-2.5 text-xs text-brass/90">
          Sending is simulated in the sandbox. {to ? <>Would go to <span className="text-brass">{to}</span>.</> : "No contact details on file for this client."}
        </div>

        <Field label="Template">
          <select className="input" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">Start from scratch…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.category} — {t.name}</option>)}
          </select>
        </Field>

        {channel === "EMAIL" && (
          <Field label="Subject">
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Thanks for visiting" />
          </Field>
        )}

        <Field
          label="Message"
          hint={channel === "SMS"
            ? `${seg.chars} characters · ${seg.segments} segment${seg.segments === 1 ? "" : "s"} · “Reply STOP to opt out” is added automatically`
            : undefined}
        >
          <textarea className="input resize-y text-[13px]" rows={channel === "EMAIL" ? 7 : 4}
            value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hey {{client_name}}, …" />
        </Field>

        <div className="flex flex-wrap items-center gap-1.5">
          {TEMPLATE_VARIABLES.slice(0, 5).map((v) => (
            <button key={v.key} type="button" onClick={() => setBody((b) => `${b}{{${v.key}}}`)} title={v.label}
              className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-cream/50 transition hover:border-brass/40 hover:text-brass">
              {`{{${v.key}}}`}
            </button>
          ))}
          <button type="button" onClick={() => setShowPreview((s) => !s)} className="ml-auto text-xs font-semibold text-brass hover:underline">
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        </div>

        {showPreview && body.trim() && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/35">Preview</div>
            {channel === "EMAIL" && renderedSubject && <div className="mb-1.5 text-sm font-semibold text-cream">{renderedSubject}</div>}
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-cream/75">{finalBody}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
