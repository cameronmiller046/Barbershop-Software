import { NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { isSlotFree } from "@/lib/availability";
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
    if (!(await isSlotFree(tenant.id, appt.barberId, start, end, appt.id))) {
      return NextResponse.json({ error: "That slot was just taken — pick another." }, { status: 409 });
    }
    await prisma.appointment.update({ where: { id: appt.id }, data: { startTime: start, endTime: end } });
    await audit({ action: "appointment.rescheduled", tenantId: tenant.id, target: appt.id });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
