"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { provisionTenant } from "@/lib/provision";
import { audit } from "@/lib/audit";
import { SUPERADMIN_ASSIGNABLE } from "@/lib/roles";
import { isPermKey, overridesOf } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import type { TenantStatus, Role } from "@prisma/client";

export async function approveApplication(id: string) {
  const admin = await requirePlatformAdmin();
  const app = await prisma.betaApplication.findUnique({ where: { id } });
  if (!app || app.status !== "PENDING") return;
  try {
    await provisionTenant({
      businessName: app.businessName,
      ownerName: app.ownerName,
      ownerEmail: app.email,
      phone: app.phone,
      applicationId: app.id,
    });
    await audit({ action: "admin.approved", userId: admin.id, target: app.id });
  } catch (err) {
    // Surface provisioning failure by marking the app back to pending with a note.
    console.error("[provision] failed", err);
  }
  revalidatePath("/admin/applications");
  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
}

export async function rejectApplication(id: string) {
  const admin = await requirePlatformAdmin();
  await prisma.betaApplication.update({
    where: { id },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });
  await audit({ action: "admin.rejected", userId: admin.id, target: id });
  revalidatePath("/admin/applications");
}

export async function setTenantStatus(id: string, status: TenantStatus) {
  const admin = await requirePlatformAdmin();
  await prisma.tenant.update({ where: { id }, data: { status } });
  await audit({ action: "admin.tenant.status", userId: admin.id, target: id, meta: { status } });
  revalidatePath("/admin/tenants");
}

export async function toggleFeature(id: string, field: "featureSocial" | "featureAnalytics", value: boolean) {
  const admin = await requirePlatformAdmin();
  await prisma.tenant.update({ where: { id }, data: { [field]: value } });
  await audit({ action: "admin.tenant.feature", userId: admin.id, target: id, meta: { field, value } });
  revalidatePath("/admin/tenants");
}

// ── Superadmin: manage all user accounts ──

/** Change a user's level (role) and store, with hierarchy guardrails. */
export async function changeUserRole(userId: string, formData: FormData) {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return; // a Superadmin can't change their own level (lockout guard)

  const role = String(formData.get("role")) as Role;
  if (!SUPERADMIN_ASSIGNABLE.includes(role)) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  // Superadmin has no store; store-scoped roles must belong to a tenant.
  let tenantId: string | null = String(formData.get("tenantId") || "") || target.tenantId;
  if (role === "PLATFORM_ADMIN") tenantId = null;
  else if (!tenantId) return; // store-scoped role requires a store

  await prisma.user.update({ where: { id: userId }, data: { role, tenantId } });
  await audit({ action: "admin.user.role", userId: admin.id, target: userId, meta: { role, tenantId } });
  revalidatePath("/admin/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return; // can't deactivate yourself
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await audit({ action: "admin.user.active", userId: admin.id, target: userId, meta: { active } });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return;
  // Don't delete the last Superadmin.
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (target?.role === "PLATFORM_ADMIN") {
    const supers = await prisma.user.count({ where: { role: "PLATFORM_ADMIN" } });
    if (supers <= 1) return;
  }
  await prisma.user.delete({ where: { id: userId } });
  await audit({ action: "admin.user.deleted", userId: admin.id, target: userId });
  revalidatePath("/admin/users");
}

/** Create any account: a new Superadmin, or a store-scoped Admin / Standard user. */
export async function createUserAccount(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "") as Role;
  let tenantId: string | null = String(formData.get("tenantId") || "") || null;

  if (!email || !name || password.length < 6 || !SUPERADMIN_ASSIGNABLE.includes(role)) return;
  if (role === "PLATFORM_ADMIN") tenantId = null;
  else if (!tenantId) return;

  if (await prisma.user.findUnique({ where: { email } })) return; // email taken

  const user = await prisma.user.create({
    data: { email, name, role, tenantId, passwordHash: await bcrypt.hash(password, 10) },
  });
  // Make new barbers immediately bookable.
  if (role === "BARBER" && tenantId) {
    await prisma.workingHour.createMany({
      data: [1, 2, 3, 4, 5].map((dow) => ({ tenantId, barberId: user.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 18 * 60 })),
    });
  }
  await audit({ action: "admin.user.created", userId: admin.id, target: email, meta: { role, tenantId } });
  revalidatePath("/admin/users");
}

/**
 * Set a single per-user permission override.
 * value: "allow" | "deny" sets an explicit override; "default" clears it (use role default).
 */
export async function setUserPermission(userId: string, key: string, value: "default" | "allow" | "deny") {
  const admin = await requirePlatformAdmin();
  if (!isPermKey(key)) return;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { permissionOverrides: true } });
  if (!target) return;

  const overrides: Record<string, boolean> = { ...overridesOf({ role: "BARBER", permissionOverrides: target.permissionOverrides }) };
  if (value === "default") delete overrides[key];
  else overrides[key] = value === "allow";

  await prisma.user.update({
    where: { id: userId },
    data: { permissionOverrides: Object.keys(overrides).length ? overrides : Prisma.JsonNull },
  });
  await audit({ action: "admin.user.permission", userId: admin.id, target: userId, meta: { key, value } });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

/** Clear all per-user overrides (reset to role defaults). */
export async function resetUserPermissions(userId: string) {
  const admin = await requirePlatformAdmin();
  await prisma.user.update({ where: { id: userId }, data: { permissionOverrides: Prisma.JsonNull } });
  await audit({ action: "admin.user.permission.reset", userId: admin.id, target: userId });
  revalidatePath(`/admin/users/${userId}`);
}

/** Onboard a paying customer directly: provision a store + owner account. */
export async function createStore(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const businessName = String(formData.get("businessName") || "").trim();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const ownerEmail = String(formData.get("ownerEmail") || "").toLowerCase().trim();
  if (!businessName || !ownerName || !ownerEmail) return;
  try {
    await provisionTenant({ businessName, ownerName, ownerEmail, phone: String(formData.get("phone") || "") || null });
    await audit({ action: "admin.store.created", userId: admin.id, target: businessName });
  } catch (err) {
    console.error("[createStore] failed", err);
  }
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
