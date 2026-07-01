import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { isSlotFree } from "@/lib/availability";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";
import { appUrl } from "@/lib/utils";

const schema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  start: z.string().datetime(),
  name: z.string().trim().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(40).refine((v) => v.replace(/\D/g, "").length >= 7, "A valid phone number is required"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

// POST /api/t/[slug]/appointments — public booking, scoped to one tenant.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const rl = rateLimit(`book:${tenant.id}:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking details" }, { status: 400 });
  const { serviceId, barberId, start, name, email, phone, notes } = parsed.data;

  // Validate service + barber belong to THIS tenant (isolation).
  const [service, barber] = await Promise.all([
    prisma.service.findFirst({ where: { id: serviceId, tenantId: tenant.id } }),
    prisma.user.findFirst({ where: { id: barberId, tenantId: tenant.id, role: "BARBER" } }),
  ]);
  if (!service || !barber) return NextResponse.json({ error: "Invalid service or barber" }, { status: 400 });

  const startTime = new Date(start);
  const endTime = addMinutes(startTime, service.durationMin);
  if (startTime < new Date()) return NextResponse.json({ error: "That time is in the past" }, { status: 400 });
  if (!(await isSlotFree(tenant.id, barberId, startTime, endTime))) {
    return NextResponse.json({ error: "Sorry, that slot was just taken. Pick another time." }, { status: 409 });
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
      data: { tenantId: tenant.id, name, email: email || null, phone: phone || null },
    }));

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      serviceId,
      barberId,
      clientId: client.id,
      startTime,
      endTime,
      notes: notes || null,
      status: "CONFIRMED",
    },
  });

  await audit({ action: "appointment.created", tenantId: tenant.id, target: appointment.id });

  const manageUrl = appUrl(`/t/${tenant.slug}/appointments/${appointment.manageToken}`);
  if (email) {
    await sendEmail({
      to: email,
      subject: `Booking confirmed — ${tenant.name}`,
      html: emailLayout("You're booked!", `
        <p>Hi ${name}, your appointment at <b>${tenant.name}</b> is confirmed.</p>
        <p><b>${service.name}</b> with ${barber.name}<br/>${startTime.toLocaleString()}</p>
        <p>Manage your appointment: <a href="${manageUrl}" style="color:#c9a24b">${manageUrl}</a></p>
      `),
    });
  }

  return NextResponse.json({ redirect: `/t/${tenant.slug}/appointments/${appointment.manageToken}?booked=1` });
}
