import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { getUpcomingDays, getUpcomingDaysAnyBarber } from "@/lib/availability";

export const dynamic = "force-dynamic";

// GET /api/t/[slug]/availability?serviceId=&barberId=
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  let barberId = searchParams.get("barberId");
  if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });

  const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId: tenant.id } });
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // A service tied to a specific barber always wins over any request.
  if (service.barberId) barberId = service.barberId;

  // Specific barber requested (or locked): show only their real availability.
  if (barberId) {
    const days = await getUpcomingDays(tenant.id, barberId, service.durationMin, 21, tenant.slotIntervalMin, tenant.timezone);
    // Distinguish "hasn't published a schedule" from "schedule exists but is full",
    // so the booking UI can hint the customer toward another choice.
    let reason: "no-hours" | "fully-booked" | null = null;
    if (days.length === 0) {
      const hours = await prisma.workingHour.count({ where: { tenantId: tenant.id, barberId } });
      reason = hours === 0 ? "no-hours" : "fully-booked";
    }
    return NextResponse.json({ barberId, durationMin: service.durationMin, days, reason });
  }

  // "No preference": union of every active barber's real openings. Each slot is
  // tagged with a barber who is free at that time so booking assigns correctly.
  const barbers = await prisma.user.findMany({
    where: { tenantId: tenant.id, role: "BARBER", active: true, kioskOnly: false },
    select: { id: true },
  });
  if (barbers.length === 0) return NextResponse.json({ barberId: null, days: [] });

  const days = await getUpcomingDaysAnyBarber(tenant.id, barbers.map((b) => b.id), service.durationMin, 21, tenant.slotIntervalMin, tenant.timezone);
  return NextResponse.json({ barberId: null, durationMin: service.durationMin, days });
}
