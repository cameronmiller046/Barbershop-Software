import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { isWithinWorkingHours } from "@/lib/availability";
import { limit, clientIp } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

const rescheduleSchema = z.object({ action: z.literal("reschedule"), start: z.string().datetime() });
const cancelSchema = z.object({ action: z.literal("cancel") });

// PATCH /api/t/[slug]/appointments/[token] — reschedule or cancel by token.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; token: string }> },
) {
  const { slug, token } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Throttle so the token endpoint can't be brute-forced / abused.
  const rl = await limit(`manage:${tenant.id}:${clientIp(req)}`, 12, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  const appt = await prisma.appointment.findFirst({
    where: { manageToken: token, tenantId: tenant.id },
    include: { service: true },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appt.status)) {
    return NextResponse.json({ error: "This appointment can no longer be changed." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);

  if (cancelSchema.safeParse(body).success) {
    await prisma.appointment.update({ where: { id: appt.id }, data: { status: "CANCELLED" } });
    await audit({ action: "appointment.cancelled", tenantId: tenant.id, target: appt.id });
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  const r = rescheduleSchema.safeParse(body);
  if (r.success) {
    const start = new Date(r.data.start);
    const end = addMinutes(start, appt.service.durationMin);
    if (start < new Date()) return NextResponse.json({ error: "That time is in the past" }, { status: 400 });
    if (!(await isWithinWorkingHours(tenant.id, appt.barberId, start, end, tenant.timezone))) {
      return NextResponse.json({ error: "That time is outside the barber's working hours. Please pick an open time." }, { status: 400 });
    }
    try {
      await prisma.$transaction(async (tx) => {
        if (!tenant.allowDoubleBooking) {
          const clash = await tx.appointment.findFirst({
            where: {
              tenantId: tenant.id, barberId: appt.barberId, active: true, status: "CONFIRMED",
              id: { not: appt.id }, startTime: { lt: end }, endTime: { gt: start },
            },
            select: { id: true },
          });
          if (clash) throw new Error("SLOT_TAKEN");
        }
        await tx.appointment.update({ where: { id: appt.id }, data: { startTime: start, endTime: end } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (e) {
      if ((e as Error).message === "SLOT_TAKEN" || (e as { code?: string }).code === "P2034") {
        return NextResponse.json({ error: "That slot was just taken — pick another." }, { status: 409 });
      }
      throw e;
    }
    await audit({ action: "appointment.rescheduled", tenantId: tenant.id, target: appt.id });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
