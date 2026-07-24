import { redirect } from "next/navigation";
import { requireStaffWithPerms, getPortalTenant, isStoreInspector } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PortalShell, type EditNotif } from "@/components/portal/PortalShell";
import { signOut } from "@/lib/auth";
import { appUrl } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { permMap } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import { isDemoAccount } from "@/lib/demoMode";
import { FeedbackFab } from "@/components/feedback/FeedbackFab";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffWithPerms();
  // Kiosk-locked accounts can only ever see the self-check-in surface.
  if (user.kioskOnly) redirect("/kiosk");
  const tenant = await getPortalTenant(user.tenantId);
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

  const isDemo = isDemoAccount(user.email);
  async function signOutAction() {
    "use server";
    // Demo visitors flow back into the funnel (book a free demo) instead of
    // landing on a staff login they have no credentials for.
    await signOut({ redirectTo: isDemo ? "/beta" : "/login" });
  }

  return (
    <div className="portal min-h-screen">
      {/* Live portal: pull fresh server data every ~10s + on tab focus. */}
      <AutoRefresh intervalMs={10000} />
      {isStoreInspector(user.role) && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-b border-brass/30 bg-brass/15 px-4 py-1.5 text-center text-xs text-brass">
          <span>🛠 Inspecting <b className="text-cream">{tenant?.name ?? "store"}</b> — dev/admin view</span>
          <a href="/superuser" className="font-semibold underline hover:no-underline">Switch store</a>
        </div>
      )}
      <PortalShell
        user={{ name: user.name, roleLabel: roleLabel(user.role), email: user.email }}
        tenant={{ name: tenant?.name ?? "Portal" }}
        perms={perms}
        reports={limits.reports}
        planLabel={limits.label}
        showUpgrade={(tenant?.plan ?? "SOLO") !== "ENTERPRISE"}
        siteUrl={appUrl(`/t/${tenant?.slug ?? ""}`)}
        demo={isDemo}
        notifications={notifications}
        signOutAction={signOutAction}
      >
        {children}
      </PortalShell>
      <FeedbackFab user={{ name: user.name, email: user.email }} />
    </div>
  );
}
