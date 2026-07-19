import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (!user.tenantId) redirect("/login");
  return user as SessionUser & { tenantId: string };
}

/**
 * Like requireTenantStaff but loads the full DB record, including
 * permissionOverrides, so pages/actions can evaluate per-user permissions.
 */
export async function requireStaffWithPerms(): Promise<StaffWithPerms> {
  const session = await requireTenantStaff();
  const full = await prisma.user.findUnique({
    where: { id: session.id, active: true },
    select: { id: true, name: true, email: true, role: true, tenantId: true, permissionOverrides: true, kioskOnly: true },
  });
  if (!full || !full.tenantId) redirect("/login");
  return { ...full, tenantId: full.tenantId };
}

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
};

export function hasAtLeast(role: Role | undefined, min: Role) {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export function isOwner(user: SessionUser) {
  return user.role === "OWNER";
}
