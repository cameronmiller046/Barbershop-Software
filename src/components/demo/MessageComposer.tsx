"use client";

/**
 * Sandbox message composer. Mirrors the live portal composer, but nothing is
 * delivered — the message is rendered with the client's real sandbox details
 * and recorded in demo state so the Templates page can show usage counts.
 *
 * Text and Email are independently toggleable: with both on, one send records
 * a message per channel (same body; the subject applies to the email).
 */

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Modal, Btn, Field, cx } from "@/components/demo/ui";
import { Icon } from "@/components/home/icons";
import { renderTemplate, smsSegments, withOptOut, TEMPLATE_VARIABLES } from "@/lib/messageTemplates";
import type { Customer } from "@/lib/demo/types";

export function MessageComposer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [sms, setSms] = useState(!!customer.phone);
  const [emailOn, setEmailOn] = useState(!customer.phone && !!customer.email);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  // With both channels on, every active template is fair game; the body is
  // shared and the subject only matters for the email copy.
  const availableTemplates = state.templates.filter((t) =>
    t.active && ((sms && t.channel === "SMS") || (emailOn && t.channel === "EMAIL")),
  );

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
  const smsBody = withOptOut(renderedBody);
  const seg = smsSegments(smsBody);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = state.templates.find((x) => x.id === id);
    if (!t) return;
    setBody(t.body);
    setSubject(t.subject ?? "");
  };

  const channelCount = (sms ? 1 : 0) + (emailOn ? 1 : 0);
  const sendLabel = sms && emailOn ? "Send text & email" : sms ? "Send text" : "Send email";
  const canSend = channelCount > 0 && !!body.trim();

  const send = () => {
    if (!canSend) return;
    if (sms && customer.phone) {
      actions.logMessage({
        customerId: customer.id, channel: "SMS", toAddress: customer.phone,
        subject: null, body: smsBody, templateId: templateId || null,
      });
    }
    if (emailOn && customer.email) {
      actions.logMessage({
        customerId: customer.id, channel: "EMAIL", toAddress: customer.email,
        subject: renderedSubject || null, body: renderedBody, templateId: templateId || null,
      });
    }
    toast(
      sms && emailOn
        ? `Text and email sent to ${customer.name} (simulated)`
        : `${sms ? "Text" : "Email"} sent to ${customer.name} (simulated)`,
      "success",
    );
    onClose();
  };

  const destinations = [
    sms && customer.phone ? customer.phone : null,
    emailOn && customer.email ? customer.email : null,
  ].filter(Boolean).join(" and ");

  return (
    <Modal
      open onClose={onClose} wide
      title={`Message ${customer.name}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="gold" onClick={send} disabled={!canSend}>{sendLabel}</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="label">Send as</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {([
              ["Text message", sms, setSms, !customer.phone, "No phone on file"],
              ["Email", emailOn, setEmailOn, !customer.email, "No email on file"],
            ] as const).map(([label, on, set, disabled, why]) => (
              <button key={label} type="button" disabled={disabled} aria-pressed={on}
                onClick={() => set(!on)}
                title={disabled ? why : undefined}
                className={cx("flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                  on ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60 hover:text-cream")}>
                {on && <Icon.check className="h-3.5 w-3.5" />}{label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-cream/40">Pick one or both — with both on, the client gets the message twice, once per channel.</p>
        </div>

        <div className="rounded-xl border border-brass/20 bg-brass/[0.06] px-3.5 py-2.5 text-xs text-brass/90">
          Sending is simulated in the sandbox. {destinations
            ? <>Would go to <span className="text-brass">{destinations}</span>.</>
            : "Select at least one channel."}
        </div>

        <Field label="Template">
          <select className="input" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
            <option value="">Start from scratch…</option>
            {availableTemplates.map((t) => <option key={t.id} value={t.id}>{t.channel === "SMS" ? "SMS" : "Email"} · {t.category} — {t.name}</option>)}
          </select>
        </Field>

        {emailOn && (
          <Field label="Subject (email only)">
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Thanks for visiting" />
          </Field>
        )}

        <Field
          label="Message"
          hint={sms
            ? `${seg.chars} characters · ${seg.segments} segment${seg.segments === 1 ? "" : "s"} · “Reply STOP to opt out” is added to the text automatically`
            : undefined}
        >
          <textarea className="input resize-y text-[13px]" rows={emailOn && !sms ? 7 : 5}
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
          <div className="space-y-3">
            {sms && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/35">Text preview</div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-cream/75">{smsBody}</p>
              </div>
            )}
            {emailOn && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/35">Email preview</div>
                {renderedSubject && <div className="mb-1.5 text-sm font-semibold text-cream">{renderedSubject}</div>}
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-cream/75">{renderedBody}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
