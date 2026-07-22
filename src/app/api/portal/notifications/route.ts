import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import type { EditNotif } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

// Lightweight feed for the portal notification bell. The client polls this every
// few seconds so pending timeclock edits appear in near-real-time without a full
// page reload. Managers (shop.team) only; everyone else gets an empty list.
export async function GET() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ notifications: [] }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: uid, active: true },
    select: { role: true, tenantId: true, permissionOverrides: true },
  });
  if (!user?.tenantId || !can(user, "shop.team")) {
    return NextResponse.json({ notifications: [] });
  }

  const reqs = await prisma.timeEditRequest.findMany({
    where: { tenantId: user.tenantId, status: "PENDING" },
    orderBy: { createdAt: "desc" }, take: 25,
    include: { user: { select: { name: true } }, entry: { select: { clockIn: true, clockOut: true } } },
  });
  const notifications: EditNotif[] = reqs.map((r) => ({
    id: r.id, barberName: r.user.name, createdISO: r.createdAt.toISOString(), reason: r.reason,
    currentIn: r.entry.clockIn.toISOString(), currentOut: r.entry.clockOut?.toISOString() ?? null,
    proposedIn: r.proposedClockIn?.toISOString() ?? null, proposedOut: r.proposedClockOut?.toISOString() ?? null,
  }));
  return NextResponse.json({ notifications });
}
