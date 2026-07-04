import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal/PortalShell";
import { signOut } from "@/lib/auth";
import { appUrl } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import { permMap } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import { isDemoAccount } from "@/lib/demoMode";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffWithPerms();
  // Kiosk-locked accounts can only ever see the self-check-in surface.
  if (user.kioskOnly) redirect("/kiosk");
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, slug: true, plan: true } });
  const perms = permMap(user);
  const limits = planLimits(tenant?.plan ?? "SOLO");

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
        showUpgrade={(tenant?.plan ?? "SOLO") !== "ENTERPRISE"}
        siteUrl={appUrl(`/t/${tenant?.slug ?? ""}`)}
        demo={isDemoAccount(user.email)}
        signOutAction={signOutAction}
      >
        {children}
      </PortalShell>
    </div>
  );
}
