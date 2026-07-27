import { prisma } from "@/lib/prisma";
import { sendEmail, emailLayout } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { appUrl } from "@/lib/utils";

function whenLabel(d: Date, tz?: string) {
  return d.toLocaleString("en-US", { timeZone: tz || "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Send pre-appointment reminders that are now due. An appointment is due when it
 * is CONFIRMED, still upcoming, not yet reminded, in a shop with reminders on,
 * and within reminderHoursBefore of its start. Idempotent + concurrency-safe:
 * each appointment is atomically "claimed" (reminderSentAt set) before sending,
 * and the claim is released only if a channel was tried and every one failed.
 */
export async function sendDueReminders(now = new Date()): Promise<{ sent: number; email: number; sms: number; failed: number }> {
  const candidates = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED", active: true, reminderSentAt: null,
      startTime: { gt: now },
      tenant: { remindersEnabled: true },
    },
    select: {
      id: true, startTime: true, manageToken: true,
      tenant: { select: { name: true, slug: true, timezone: true, reminderEmail: true, reminderSms: true, reminderHoursBefore: true, twilioAccountSid: true, twilioAuthToken: true, twilioFromNumber: true, sendgridApiKey: true, emailFromAddress: true } },
      client: { select: { name: true, email: true, phone: true, smsOptOut: true } },
      service: { select: { name: true } },
      barber: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 300,
  });

  let sent = 0, email = 0, sms = 0, failed = 0;
  const nowMs = now.getTime();

  for (const a of candidates) {
    const windowMs = Math.max(1, a.tenant.reminderHoursBefore) * 3_600_000;
    if (a.startTime.getTime() - nowMs > windowMs) continue; // not inside the reminder window yet

    // Claim so concurrent workers never double-send.
    const claim = await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claim.count !== 1) continue;

    const when = whenLabel(a.startTime, a.tenant.timezone);
    const manageUrl = appUrl(`/t/${a.tenant.slug}/appointments/${a.manageToken}`);
    let attempted = false, delivered = false;

    if (a.tenant.reminderEmail && a.client.email) {
      attempted = true;
      const r = await sendEmail({
        to: a.client.email,
        subject: `Reminder: your appointment at ${a.tenant.name}`,
        html: emailLayout("See you soon!", `<p>Hi ${a.client.name}, this is a reminder for your upcoming appointment at <b>${a.tenant.name}</b>.</p><p><b>${a.service.name}</b> with ${a.barber.name}<br/>${when}</p><p>Manage or cancel: <a href="${manageUrl}" style="color:#c9a24b">${manageUrl}</a></p>`),
      }, { sendgridApiKey: a.tenant.sendgridApiKey, from: a.tenant.emailFromAddress });
      if (r.ok) { email++; delivered = true; } else failed++;
    }
    if (a.tenant.reminderSms && a.client.phone && !a.client.smsOptOut) {
      attempted = true;
      const r = await sendSms(
        a.client.phone,
        `Reminder: ${a.service.name} with ${a.barber.name} at ${a.tenant.name}, ${when}. Manage: ${manageUrl} — Reply STOP to opt out.`,
        { accountSid: a.tenant.twilioAccountSid, authToken: a.tenant.twilioAuthToken, from: a.tenant.twilioFromNumber },
      );
      if (r.ok) { sms++; delivered = true; } else failed++;
    }

    if (delivered) sent++;
    else if (attempted) {
      // A channel was tried and all failed — release the claim so it retries next run.
      await prisma.appointment.updateMany({ where: { id: a.id }, data: { reminderSentAt: null } });
    }
    // If nothing was attempted (no deliverable channel), keep it claimed so we don't spin.
  }
  return { sent, email, sms, failed };
}

/**
 * Notify a client that the shop canceled their appointment. Best-effort over the
 * shop's own email/SMS creds (falling back to server env); SMS respects opt-out.
 * Never throws — a failed notification must not break the cancel action.
 */
export async function notifyClientCanceled(appointmentId: string): Promise<void> {
  try {
    const a = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        startTime: true,
        tenant: { select: { name: true, timezone: true, sendgridApiKey: true, emailFromAddress: true, twilioAccountSid: true, twilioAuthToken: true, twilioFromNumber: true } },
        client: { select: { name: true, email: true, phone: true, smsOptOut: true } },
        service: { select: { name: true } },
      },
    });
    if (!a || !a.client) return;
    const when = whenLabel(a.startTime, a.tenant.timezone);
    if (a.client.email) {
      await sendEmail({
        to: a.client.email,
        subject: `Your appointment at ${a.tenant.name} was canceled`,
        html: emailLayout("Appointment canceled", `
          <p>Hi ${a.client.name}, your <b>${a.service.name}</b> appointment at <b>${a.tenant.name}</b> on ${when} has been canceled.</p>
          <p>Sorry for any inconvenience — you're welcome to book a new time whenever works for you.</p>
        `),
      }, { sendgridApiKey: a.tenant.sendgridApiKey, from: a.tenant.emailFromAddress });
    }
    if (a.client.phone && !a.client.smsOptOut) {
      await sendSms(
        a.client.phone,
        `${a.tenant.name}: your ${a.service.name} appointment on ${when} was canceled. Feel free to rebook anytime.`,
        { accountSid: a.tenant.twilioAccountSid, authToken: a.tenant.twilioAuthToken, from: a.tenant.twilioFromNumber },
      );
    }
  } catch (err) {
    console.error("[notify] cancel notification failed:", err);
  }
}
