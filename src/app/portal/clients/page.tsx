import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { segmentOf, initialsOf } from "@/lib/clientSegments";
import { computeClientDetail, CLIENT_DETAIL_INCLUDE } from "@/lib/clientDetail";
import { loyaltyConfigOf, LOYALTY_SELECT } from "@/lib/loyalty";
import { ClientsWorkspace, type ClientRow } from "@/components/portal/ClientsWorkspace";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.clients")) redirect("/portal");
  const tenantId = user.tenantId;
  const now = Date.now();

  const [clients, agg] = await Promise.all([
    prisma.client.findMany({ where: { tenantId }, select: { id: true, name: true, phone: true, email: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 3000 }),
    prisma.appointment.groupBy({ by: ["clientId"], where: { tenantId, active: true, status: "COMPLETED" }, _count: { _all: true }, _sum: { collectedCents: true }, _max: { startTime: true } }),
  ]);
  const aggMap = new Map(agg.map((a) => [a.clientId, { visits: a._count._all, spent: a._sum.collectedCents ?? 0, last: a._max.startTime }]));

  const rows: ClientRow[] = clients.map((c) => {
    const a = aggMap.get(c.id);
    const visits = a?.visits ?? 0;
    const spentCents = a?.spent ?? 0;
    const lastMs = a?.last ? a.last.getTime() : null;
    const seg = segmentOf({ visits, spentCents, lastVisitMs: lastMs, createdAtMs: c.createdAt.getTime(), now });
    return { id: c.id, name: c.name, phone: c.phone, initials: initialsOf(c.name), visits, spentCents, lastVisitISO: a?.last ? a.last.toISOString() : null, ...seg };
  });
  // Default order = most recent visit first (matches the default "Last Visit" sort).
  rows.sort((x, y) => (y.lastVisitISO ? Date.parse(y.lastVisitISO) : 0) - (x.lastVisitISO ? Date.parse(x.lastVisitISO) : 0));

  const counts = {
    all: rows.length,
    active: rows.filter((r) => r.isActive).length,
    new: rows.filter((r) => r.isNew).length,
    vip: rows.filter((r) => r.isVip).length,
    inactive: rows.filter((r) => !r.isActive).length,
  };

  const firstId = rows[0]?.id;
  const [first, tenant] = await Promise.all([
    firstId ? prisma.client.findFirst({ where: { id: firstId, tenantId }, include: CLIENT_DETAIL_INCLUDE }) : null,
    prisma.tenant.findUnique({ where: { id: tenantId }, select: LOYALTY_SELECT }),
  ]);
  const loyaltyConfig = tenant ? loyaltyConfigOf(tenant) : undefined;
  const initialDetail = first ? computeClientDetail(first, now, loyaltyConfig) : null;

  return <ClientsWorkspace rows={rows} counts={counts} initialDetail={initialDetail} />;
}
