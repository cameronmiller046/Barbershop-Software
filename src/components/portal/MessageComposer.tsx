"use client";

/**
 * One-to-one client message composer. Picks a shop template (or free-types),
 * previews it with the client's real variable values, and sends over SMS
 * (Twilio) or email. The preview is rendered server-side by previewTemplate so
 * what's shown is exactly what the send path will produce.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/home/icons";
import { smsSegments, TEMPLATE_VARIABLES } from "@/lib/messageTemplates";
import { sendClientMessage, previewTemplate } from "@/app/portal/messageActions";

export type ComposerTemplate = {
  id: string; name: string; channel: "SMS" | "EMAIL"; category: string; subject: string | null; body: string;
};

export function MessageComposer({
  client, templates, providers, onClose,
}: {
  client: { id: string; name: string; phone: string | null; email: string | null; smsOptOut?: boolean };
  templates: ComposerTemplate[];
  providers: { sms: boolean; email: boolean };
  onClose: () => void;
}) {
  const canSms = !!client.phone && !client.smsOptOut;
  const [channel, setChannel] = useState<"SMS" | "EMAIL">(canSms ? "SMS" : "EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();

  const forChannel = useMemo(() => templates.filter((t) => t.channel === channel), [templates, channel]);
  const seg = smsSegments(body);
  const to = channel === "SMS" ? client.phone : client.email;
  const missingTo = !to;
  const blockedSms = channel === "SMS" && !!client.smsOptOut;
  const providerLive = channel === "SMS" ? providers.sms : providers.email;

  // Refresh the server-rendered preview shortly after typing stops.
  useEffect(() => {
    if (!showPreview || !body.trim()) { setPreview(null); return; }
    const id = setTimeout(() => {
      void previewTemplate(client.id, subject, body).then(setPreview).catch(() => setPreview(null));
    }, 250);
    return () => clearTimeout(id);
  }, [showPreview, body, subject, client.id]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setBody(t.body);
    setSubject(t.subject ?? "");
  };

  const send = () => start(async () => {
    setResult(null);
    const res = await sendClientMessage({ clientId: client.id, channel, subject, body, templateId: templateId || undefined });
    if (res.ok) {
      setResult({
        ok: true,
        msg: res.status === "LOGGED"
          ? `No ${channel === "SMS" ? "Twilio" : "email"} provider connected — the message was logged, not delivered.`
          : `${channel === "SMS" ? "Text" : "Email"} sent to ${client.name}.`,
      });
      setTimeout(onClose, 1600);
    } else {
      setResult({ ok: false, msg: res.error || "Could not send" });
    }
  });

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#131217] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-cream">Message {client.name}</h3>
            <p className="truncate text-xs text-cream/45">{to || "No contact details on file"}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-cream/40 hover:text-cream">✕</button>
        </div>

        <div className="p-scroll max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2">
            {(["SMS", "EMAIL"] as const).map((c) => {
              const disabled = c === "SMS" ? !client.phone : !client.email;
              return (
                <button key={c} type="button" disabled={disabled} onClick={() => { setChannel(c); setTemplateId(""); }}
                  className={`rounded-lg border py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${channel === c ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60 hover:text-cream"}`}>
                  {c === "SMS" ? "Text message" : "Email"}
                </button>
              );
            })}
          </div>

          {blockedSms && (
            <Banner tone="red">{client.name} replied STOP and can&apos;t be texted. Send an email instead.</Banner>
          )}
          {missingTo && !blockedSms && (
            <Banner tone="red">No {channel === "SMS" ? "phone number" : "email address"} on file for {client.name}.</Banner>
          )}
          {!providerLive && !missingTo && !blockedSms && (
            <Banner tone="gold">
              {channel === "SMS" ? "Twilio isn't connected" : "No email provider is connected"} — this will be logged, not delivered.{" "}
              <a href="/portal/settings" className="font-semibold underline hover:no-underline">Connect</a>
            </Banner>
          )}

          <label className="block">
            <span className="label">Template</span>
            <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="input">
              <option value="">Start from scratch…</option>
              {forChannel.map((t) => <option key={t.id} value={t.id}>{t.category} — {t.name}</option>)}
            </select>
          </label>

          {channel === "EMAIL" && (
            <label className="block">
              <span className="label">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Thanks for visiting" className="input" />
            </label>
          )}

          <label className="block">
            <span className="label">Message</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={channel === "EMAIL" ? 8 : 5}
              placeholder={`Hey {{client_name}}, …`} className="input resize-y text-[13px]" />
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            {TEMPLATE_VARIABLES.slice(0, 5).map((v) => (
              <button key={v.key} type="button" onClick={() => setBody((b) => `${b}{{${v.key}}}`)} title={v.label}
                className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-cream/50 transition hover:border-brass/40 hover:text-brass">
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-cream/45">
            <span>
              {channel === "SMS"
                ? <>{seg.chars} characters · {seg.segments} segment{seg.segments === 1 ? "" : "s"}{seg.segments > 1 ? " (billed as multiple texts)" : ""} · &ldquo;Reply STOP to opt out&rdquo; is added automatically</>
                : "Variables are filled in when the message is sent."}
            </span>
            <button type="button" onClick={() => setShowPreview((s) => !s)} className="font-semibold text-brass hover:underline">
              {showPreview ? "Hide preview" : "Preview"}
            </button>
          </div>

          {showPreview && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/35">Preview</div>
              {preview ? (
                <>
                  {channel === "EMAIL" && preview.subject && <div className="mb-1.5 text-sm font-semibold text-cream">{preview.subject}</div>}
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-cream/75">{preview.body}</p>
                </>
              ) : <p className="text-[13px] text-cream/35">Type a message to see the preview.</p>}
            </div>
          )}

          {result && <Banner tone={result.ok ? "green" : "red"}>{result.msg}</Banner>}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-3.5">
          <button onClick={onClose} className="p-btn-ghost">Cancel</button>
          <button onClick={send} disabled={pending || !body.trim() || missingTo || blockedSms}
            className="p-btn-gold disabled:cursor-not-allowed disabled:opacity-50">
            <Icon.messages className="h-4 w-4" />
            {pending ? "Sending…" : channel === "SMS" ? "Send text" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "red" | "gold" | "green"; children: React.ReactNode }) {
  const tones = {
    red: "border-red-400/30 bg-red-400/10 text-red-200",
    gold: "border-brass/25 bg-brass/[0.08] text-brass/90",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  };
  return <div className={`rounded-xl border px-3.5 py-2.5 text-xs ${tones[tone]}`}>{children}</div>;
}
