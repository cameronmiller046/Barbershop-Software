"use server";

/**
 * Client messaging — send a one-off SMS (Twilio) or email (SendGrid/Resend) to a
 * single client, and manage the shop's reusable templates.
 *
 * Delivery reuses lib/sms + lib/email, so a shop's own Twilio credentials are
 * used when connected in Settings and the server env is the fallback. With
 * neither configured the providers log instead of sending, and the send is
 * recorded as LOGGED so the UI can say so plainly rather than claiming success.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePortalStaff } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendSms, smsReady } from "@/lib/sms";
import { sendEmail, emailReady, emailLayout } from "@/lib/email";
import { appUrl } from "@/lib/utils";
import { renderTemplate, withOptOut, SEED_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/messageTemplates";
import type { MessageChannel, MessageStatus } from "@prisma/client";

const TENANT_SEND_SELECT = {
  name: true, slug: true, phone: true,
  twilioAccountSid: true, twilioAuthToken: true, twilioFromNumber: true,
  sendgridApiKey: true, emailFromAddress: true,
} as const;

export type SendResult = { ok: boolean; status?: MessageStatus; error?: string };

/**
 * Seed the default template set for a shop. Idempotent via seedKey: rows the
 * shop already has (edited or not) are left alone, and only genuinely new
 * seedKeys are inserted, so this is safe to call on every templates page load.
 */
export async function ensureSeedTemplates(tenantId: string): Promise<void> {
  const existing = await prisma.messageTemplate.findMany({
    where: { tenantId, seedKey: { not: null } },
    select: { seedKey: true },
  });
  const have = new Set(existing.map((t) => t.seedKey));
  const missing = SEED_TEMPLATES.filter((t) => !have.has(t.seedKey));
  if (!missing.length) return;
  await prisma.messageTemplate.createMany({
    data: missing.map((t) => ({
      tenantId, seedKey: t.seedKey, name: t.name, channel: t.channel,
      category: t.category, subject: t.subject ?? null, body: t.body,
    })),
    skipDuplicates: true,
  });
}

/** Variable values for a client, used to render a template server-side. */
async function varsForClient(tenantId: string, clientId: string, barberName: string) {
  const [client, tenant, lastAppt, nextAppt] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { name: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true, phone: true } }),
    prisma.appointment.findFirst({
      where: { tenantId, clientId, active: true, status: "COMPLETED" },
      orderBy: { startTime: "desc" }, select: { startTime: true, service: { select: { name: true } } },
    }),
    prisma.appointment.findFirst({
      where: { tenantId, clientId, active: true, status: "CONFIRMED", startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" }, select: { startTime: true },
    }),
  ]);
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtFull = (d: Date) => d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return {
    client_name: (client?.name ?? "").split(" ")[0],
    shop_name: tenant?.name ?? "",
    barber_name: (barberName || "").split(" ")[0],
    last_service: lastAppt?.service.name ?? "",
    last_visit: lastAppt ? fmtDate(lastAppt.startTime) : "",
    next_visit: nextAppt ? fmtFull(nextAppt.startTime) : "",
    booking_link: tenant?.slug ? appUrl(`/t/${tenant.slug}/book`) : "",
    shop_phone: tenant?.phone ?? "",
  };
}

/** Render a template's subject/body for a client — powers the composer preview. */
export async function previewTemplate(clientId: string, subject: string, body: string) {
  const user = await requirePortalStaff();
  if (!can(user, "shop.clients")) return { subject, body };
  const vars = await varsForClient(user.tenantId, clientId, user.name);
  return { subject: renderTemplate(subject, vars), body: renderTemplate(body, vars) };
}

/**
 * Send one message to one client. Renders {{variables}} server-side (never
 * trusting a pre-rendered body from the browser), enforces SMS opt-out, and
 * writes a ClientMessage row for every attempt including failures.
 */
export async function sendClientMessage(input: {
  clientId: string; channel: MessageChannel; subject?: string; body: string; templateId?: string;
}): Promise<SendResult> {
  const user = await requirePortalStaff();
  if (!can(user, "shop.clients")) return { ok: false, error: "Not allowed" };

  const tenantId = user.tenantId;
  const body = (input.body || "").trim();
  if (!body) return { ok: false, error: "Message body is empty" };
  if (body.length > 5000) return { ok: false, error: "Message is too long" };

  const [client, tenant] = await Promise.all([
    prisma.client.findFirst({
      where: { id: input.clientId, tenantId },
      select: { id: true, name: true, phone: true, email: true, smsOptOut: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: TENANT_SEND_SELECT }),
  ]);
  if (!client) return { ok: false, error: "Client not found" };

  const isSms = input.channel === "SMS";
  const to = (isSms ? client.phone : client.email) || "";
  if (!to) return { ok: false, error: isSms ? "This client has no phone number" : "This client has no email address" };
  // TCPA: a client who replied STOP must never be texted again from the portal.
  if (isSms && client.smsOptOut) return { ok: false, error: `${client.name} opted out of texts (replied STOP)` };

  const vars = await varsForClient(tenantId, client.id, user.name);
  const renderedBody = renderTemplate(body, vars);
  const renderedSubject = renderTemplate((input.subject || "").trim(), vars);
  if (!isSms && !renderedSubject) return { ok: false, error: "Email needs a subject" };

  let status: MessageStatus;
  let error: string | undefined;
  let finalBody = renderedBody;

  if (isSms) {
    finalBody = withOptOut(renderedBody);
    const creds = { accountSid: tenant?.twilioAccountSid, authToken: tenant?.twilioAuthToken, from: tenant?.twilioFromNumber };
    const res = await sendSms(to, finalBody, creds);
    status = res.ok ? (res.logged ? "LOGGED" : "SENT") : "FAILED";
    error = res.error;
  } else {
    const html = emailLayout(renderedSubject, renderedBody.split("\n\n").map((p) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`).join(""));
    const res = await sendEmail({ to, subject: renderedSubject, html }, { sendgridApiKey: tenant?.sendgridApiKey, from: tenant?.emailFromAddress });
    status = res.ok ? (res.logged ? "LOGGED" : "SENT") : "FAILED";
    error = res.error;
  }

  await prisma.clientMessage.create({
    data: {
      tenantId, clientId: client.id, channel: input.channel, toAddress: to,
      subject: isSms ? null : renderedSubject, body: finalBody,
      status, error: error ?? null,
      sentById: user.id, sentByName: user.name, templateId: input.templateId ?? null,
    },
  });
  await audit({ action: "client.message", tenantId, userId: user.id, target: client.id, meta: { channel: input.channel, status } });
  revalidatePath("/portal/clients");

  if (status === "FAILED") return { ok: false, status, error: error || "Delivery failed" };
  return { ok: true, status };
}

/** Whether each channel has a working provider — drives the composer's banner. */
export async function messagingStatus() {
  const user = await requirePortalStaff();
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: TENANT_SEND_SELECT });
  return {
    sms: smsReady({ accountSid: tenant?.twilioAccountSid, authToken: tenant?.twilioAuthToken, from: tenant?.twilioFromNumber }),
    email: emailReady({ sendgridApiKey: tenant?.sendgridApiKey, from: tenant?.emailFromAddress }),
  };
}

// ── Template CRUD ──

function readTemplateForm(formData: FormData) {
  const channel = String(formData.get("channel") || "SMS") === "EMAIL" ? "EMAIL" : "SMS";
  const categoryRaw = String(formData.get("category") || "General");
  const category = (TEMPLATE_CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : "General";
  return {
    name: String(formData.get("name") || "").trim().slice(0, 80),
    channel: channel as MessageChannel,
    category,
    subject: channel === "EMAIL" ? String(formData.get("subject") || "").trim().slice(0, 200) || null : null,
    body: String(formData.get("body") || "").trim().slice(0, 5000),
  };
}

export async function createTemplate(formData: FormData) {
  const user = await requirePortalStaff();
  if (!can(user, "shop.settings")) return;
  const data = readTemplateForm(formData);
  if (!data.name || !data.body) return;
  await prisma.messageTemplate.create({ data: { ...data, tenantId: user.tenantId } });
  await audit({ action: "template.create", tenantId: user.tenantId, userId: user.id, meta: { name: data.name } });
  revalidatePath("/portal/templates");
}

export async function updateTemplate(id: string, formData: FormData) {
  const user = await requirePortalStaff();
  if (!can(user, "shop.settings")) return;
  const data = readTemplateForm(formData);
  if (!data.name || !data.body) return;
  await prisma.messageTemplate.updateMany({ where: { id, tenantId: user.tenantId }, data });
  await audit({ action: "template.update", tenantId: user.tenantId, userId: user.id, target: id });
  revalidatePath("/portal/templates");
}

export async function deleteTemplate(id: string) {
  const user = await requirePortalStaff();
  if (!can(user, "shop.settings")) return;
  await prisma.messageTemplate.deleteMany({ where: { id, tenantId: user.tenantId } });
  await audit({ action: "template.delete", tenantId: user.tenantId, userId: user.id, target: id });
  revalidatePath("/portal/templates");
}

export async function toggleTemplate(id: string, active: boolean) {
  const user = await requirePortalStaff();
  if (!can(user, "shop.settings")) return;
  await prisma.messageTemplate.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  revalidatePath("/portal/templates");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
