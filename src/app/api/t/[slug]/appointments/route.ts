import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { isWithinWorkingHours } from "@/lib/availability";
import { limit, clientIp } from "@/lib/ratelimit";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";
import { appUrl, escapeHtml } from "@/lib/utils";

const schema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  start: z.string().datetime(),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(40).refine((v) => v.replace(/\D/g, "").length >= 7, "A valid phone number is required"),
  notes: z.string().max(500).optional().or(z.literal("")),
  smsConsent: z.boolean().optional(),
});

// POST /api/t/[slug]/appointments — public booking, scoped to one tenant.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  // A suspended (canceled / non-paying) shop can't take new bookings.
  if (tenant.status === "SUSPENDED") return NextResponse.json({ error: "This shop isn't accepting bookings right now." }, { status: 403 });

  const rl = await limit(`book:${tenant.id}:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
  const { serviceId, barberId, start, name, email, phone, notes, smsConsent } = parsed.data;

  // Validate service + barber belong to THIS tenant (isolation). Barber must be active.
  const [service, barber] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, tenantId: tenant.id } }),
    prisma.user.findFirst({ where: { id: barberId, tenantId: tenant.id, role: "BARBER", active: true, kioskOnly: false } }),
  ]);
  if (!service || !barber) return NextResponse.json({ error: "Invalid service or barber" }, { status: 400 });

  const startTime = new Date(start);
  const endTime = addMinutes(startTime, service.durationMin);
  if (startTime < new Date()) return NextResponse.json({ error: "That time is in the past" }, { status: 400 });
  // Must fall inside the barber's real working hours — the UI enforces this, but
  // the API has to as well (a direct POST could otherwise book a closed day/time).
  if (!(await isWithinWorkingHours(tenant.id, barberId, startTime, endTime, tenant.timezone))) {
    return NextResponse.json({ error: "That time is outside the barber's working hours. Please pick an open time." }, { status: 400 });
  }

  const existingClient =
    email || phone
      ? await prisma.client.findFirst({
          where: {
            tenantId: tenant.id,
            OR: [email ? { email } : undefined, phone ? { phone } : undefined].filter(Boolean) as object[],
          },
        })
      : null;

  const client =
    existingClient ??
    (await prisma.client.create({
      data: {
        tenantId: tenant.id, name, email: email || null, phone: phone || null,
        ...(smsConsent ? { smsConsent: true, smsConsentAt: new Date() } : {}),
      },
    }));

  // Record consent on an existing client too (never downgrade an existing opt-in).
  if (existingClient && smsConsent && !existingClient.smsConsent) {
    await prisma.client.update({
      where: { id: existingClient.id },
      data: { smsConsent: true, smsConsentAt: new Date() },
    });
  }

  // Create inside a SERIALIZABLE transaction so two concurrent bookings can't
  // both pass the overlap check and double-book the barber. Unless the shop has
  // opted into double-booking, re-check for a clash inside the transaction; a
  // serialization conflict (P2034) or a detected clash both surface as 409.
  let appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      if (!tenant.allowDoubleBooking) {
        const clash = await tx.appointment.findFirst({
          where: {
            tenantId: tenant.id, barberId, active: true, status: "CONFIRMED",
            startTime: { lt: endTime }, endTime: { gt: startTime },
          },
          select: { id: true },
        });
        if (clash) throw new Error("SLOT_TAKEN");
      }
      return tx.appointment.create({
        data: {
          tenantId: tenant.id, serviceId, barberId, clientId: client.id,
          startTime, endTime, notes: notes || null, status: "CONFIRMED",
          // Unguessable manage token — CSPRNG, not the guessable cuid default.
          manageToken: randomBytes(24).toString("base64url"),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (e) {
    if ((e as Error).message === "SLOT_TAKEN" || (e as { code?: string }).code === "P2034") {
      return NextResponse.json({ error: "Sorry, that slot was just taken. Pick another time." }, { status: 409 });
    }
    throw e;
  }

  await audit({ action: "appointment.created", tenantId: tenant.id, target: appointment.id });

  const manageUrl = appUrl(`/t/${tenant.slug}/appointments/${appointment.manageToken}`);
  if (email) {
    await sendEmail({
      to: email,
      subject: `Booking confirmed — ${tenant.name}`,
      html: emailLayout("You're booked!", `
        <p>Hi ${escapeHtml(name)}, your appointment at <b>${escapeHtml(tenant.name)}</b> is confirmed.</p>
        <p><b>${escapeHtml(service.name)}</b> with ${escapeHtml(barber.name)}<br/>${startTime.toLocaleString()}</p>
        <p>Manage your appointment: <a href="${manageUrl}" style="color:#c9a24b">${manageUrl}</a></p>
      `),
    }, { sendgridApiKey: tenant.sendgridApiKey, from: tenant.emailFromAddress });
  }

  return NextResponse.json({ redirect: `/t/${tenant.slug}/appointments/${appointment.manageToken}?booked=1` });
}
