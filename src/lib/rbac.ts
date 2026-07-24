import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSelectedStoreId } from "@/lib/superuser";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: Role;
  tenantId?: string | null;
};

export type StaffWithPerms = {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  permissionOverrides: unknown;
  kioskOnly: boolean;
};

/** Require any authenticated user. Redirects to /login otherwise. */
export async function requireUser(from?: string): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login${from ? `?from=${encodeURIComponent(from)}` : ""}`);
  }
  return session.user as SessionUser;
}

// Platform administration now lives in Yggdrasil (the fleet management plane),
// so platform admins are routed there instead of the deprecated in-app /admin.
export const YGGDRASIL_URL = process.env.YGGDRASIL_URL || "https://project-yggdrasil.up.railway.app";

/** Require the platform admin. */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "PLATFORM_ADMIN") redirect("/portal");
  return user;
}

/**
 * Require a staff member (OWNER/BARBER/RECEPTIONIST) bound to a tenant.
 * Returns the user with a guaranteed non-null tenantId.
 */
export async function requireTenantStaff(): Promise<SessionUser & { tenantId: string }> {
  const user = await requireUser("/portal");
  if (user.role === "PLATFORM_ADMIN") redirect(YGGDRASIL_URL);
  // SUPERUSER (hidden dev-team debug role) isn't bound to a store — it views any
  // store it picks. Resolve that selection into an effective tenantId so the rest
  // of the portal works unchanged; send them to the store picker if none is set.
  if (user.role === "SUPERUSER") {
    const storeId = await getSelectedStoreId();
    if (!storeId) redirect("/superuser");
    const store = await prisma.tenant.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) redirect("/superuser");
    return { ...user, tenantId: storeId } as SessionUser & { tenantId: string };
  }
  if (!user.tenantId) redirect("/login");
  return user as SessionUser & { tenantId: string };
}

/**
 * Like requireTenantStaff but loads the full DB record, including
 * permissionOverrides, so pages/actions can evaluate per-user permissions.
 *
 * Wrapped in React `cache()` so it runs at most once per request — the layout
 * and the page both call it, and this collapses that into a single DB lookup.
 */
export const requireStaffWithPerms = cache(async (): Promise<StaffWithPerms> => {
  const session = await requireTenantStaff();
  const full = await prisma.user.findUnique({
    where: { id: session.id, active: true },
    select: { id: true, name: true, email: true, role: true, tenantId: true, permissionOverrides: true, kioskOnly: true },
  });
  if (!full) redirect("/login");
  // SUPERUSER has no tenantId of its own — fall back to the store it selected
  // (carried on the session by requireTenantStaff above).
  const tenantId = full.tenantId ?? session.tenantId;
  if (!tenantId) redirect("/login");
  return { ...full, tenantId };
});

/**
 * The tenant fields the portal shell + dashboard need, loaded once per request.
 * Cached so the layout and page don't each hit the DB for the same row.
 */
export const getPortalTenant = cache((tenantId: string) =>
  prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, slug: true, plan: true, timezone: true } })
);

/**
 * Require a kiosk-capable staff account bound to a tenant. Any tenant staff can
 * open the self-check-in kiosk (managers to preview it, or the dedicated device
 * account). Kiosk-only accounts are funnelled here from the portal.
 */
export async function requireKioskStaff(): Promise<StaffWithPerms> {
  return requireStaffWithPerms();
}

/**
 * Require a FULL-portal staff account. Identical to requireStaffWithPerms but
 * also rejects kiosk-only device logins — because a layout redirect does NOT run
 * for server-action POSTs, so authorization for portal mutations must be enforced
 * here, at the action layer. Every /portal server action must use this guard.
 */
export async function requirePortalStaff(): Promise<StaffWithPerms> {
  const user = await requireStaffWithPerms();
  if (user.kioskOnly) redirect("/kiosk");
  return user;
}

const RANK: Record<Role, number> = {
  CUSTOMER: 0,
  RECEPTIONIST: 1,
  BARBER: 1,
  OWNER: 2,
  PLATFORM_ADMIN: 3,
  SUPERUSER: 4, // hidden dev-team debug role, above platform admin
};

export function hasAtLeast(role: Role | undefined, min: Role) {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export function isOwner(user: SessionUser) {
  return user.role === "OWNER";
}
