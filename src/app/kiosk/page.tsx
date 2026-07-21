import { requireKioskStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { KioskFlow } from "@/components/KioskFlow";
import { loyaltyConfigOf, LOYALTY_SELECT, LOYALTY_EXPIRY_DAYS, LOYALTY_MAX_POINTS } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const user = await requireKioskStaff();
  const [services, tenant] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, name: true, durationMin: true, priceCents: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, ...LOYALTY_SELECT } }),
  ]);

  // Only disclose the program on the kiosk when the shop actually runs one. The
  // expiry/cap constants are resolved here (server) so no server-only code is
  // pulled into the kiosk's client bundle.
  const cfg = tenant ? loyaltyConfigOf(tenant) : null;
  const loyalty = cfg?.enabled
    ? { pointsPerVisit: cfg.pointsPerVisit, pointsPerDollar: cfg.pointsPerDollar, threshold: cfg.threshold, rewardLabel: cfg.rewardLabel, expiryDays: LOYALTY_EXPIRY_DAYS, maxPoints: LOYALTY_MAX_POINTS }
    : null;

  return <KioskFlow shopName={tenant?.name ?? "our shop"} services={services} loyalty={loyalty} />;
}
