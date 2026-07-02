import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { getUpcomingDays } from "@/lib/availability";

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

  // Service tied to a barber wins; else use requested barber; else first barber.
  if (service.barberId) barberId = service.barberId;
  if (!barberId) {
    const first = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: "BARBER", active: true, kioskOnly: false },
    });
    barberId = first?.id ?? null;
  }
  if (!barberId) return NextResponse.json({ barberId: null, days: [] });

  const days = await getUpcomingDays(tenant.id, barberId, service.durationMin, 21, tenant.slotIntervalMin, tenant.timezone);
  return NextResponse.json({ barberId, durationMin: service.durationMin, days });
}
