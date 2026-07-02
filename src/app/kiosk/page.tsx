import { requireKioskStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { KioskFlow } from "@/components/KioskFlow";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const user = await requireKioskStaff();
  const [services, tenant] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, name: true, durationMin: true, priceCents: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }),
  ]);

  return <KioskFlow shopName={tenant?.name ?? "our shop"} services={services} />;
}
