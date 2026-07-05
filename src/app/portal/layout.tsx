import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PortalShell, type EditNotif } from "@/components/portal/PortalShell";
import { signOut } from "@/lib/auth";
import { appUrl } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { permMap } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import { isDemoAccount } from "@/lib/demoMode";
import { FeedbackFab } from "@/components/feedback/FeedbackFab";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffWithPerms();
  // Kiosk-locked accounts can only ever see the self-check-in surface.
  if (user.kioskOnly) redirect("/kiosk");
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, slug: true, plan: true } });
  const perms = permMap(user);
  const limits = planLimits(tenant?.plan ?? "SOLO");

  // Pending timeclock edit requests → the notifications bell (managers only).
  // The bell is non-essential: never let a failure here 500 the whole portal.
  let notifications: EditNotif[] = [];
  if (perms["shop.team"]) {
    try {
      const reqs = await prisma.timeEditRequest.findMany({
        where: { tenantId: user.tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" }, take: 25,
        include: { user: { select: { name: true } }, entry: { select: { clockIn: true, clockOut: true } } },
      });
      notifications = reqs.map((r) => ({
        id: r.id, barberName: r.user.name, createdISO: r.createdAt.toISOString(), reason: r.reason,
        currentIn: r.entry.clockIn.toISOString(), currentOut: r.entry.clockOut?.toISOString() ?? null,
        proposedIn: r.proposedClockIn?.toISOString() ?? null, proposedOut: r.proposedClockOut?.toISOString() ?? null,
      }));
    } catch (err) {
      console.error("[portal/layout] failed to load timeclock notifications:", err);
    }
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="portal min-h-screen">
      <PortalShell
        user={{ name: user.name, roleLabel: roleLabel(user.role), email: user.email }}
        tenant={{ name: tenant?.name ?? "Portal" }}
        perms={perms}
        reports={limits.reports}
        planLabel={limits.label}
        showUpgrade={(tenant?.plan ?? "SOLO") !== "ENTERPRISE"}
        siteUrl={appUrl(`/t/${tenant?.slug ?? ""}`)}
        demo={isDemoAccount(user.email)}
        notifications={notifications}
        signOutAction={signOutAction}
      >
        {children}
      </PortalShell>
      <FeedbackFab user={{ name: user.name, email: user.email }} />
    </div>
  );
}
