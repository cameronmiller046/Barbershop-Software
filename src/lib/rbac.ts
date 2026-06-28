import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: Role;
  tenantId?: string | null;
};

/** Require any authenticated user. Redirects to /login otherwise. */
export async function requireUser(from?: string): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login${from ? `?from=${encodeURIComponent(from)}` : ""}`);
  }
  return session.user as SessionUser;
}

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
  if (user.role === "PLATFORM_ADMIN") redirect("/admin");
  if (!user.tenantId) redirect("/login");
  return user as SessionUser & { tenantId: string };
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
