"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { provisionTenant } from "@/lib/provision";
import { audit } from "@/lib/audit";
import { loadDemoData, clearDemoData } from "@/lib/demo";
import type { TenantStatus, Plan } from "@prisma/client";

// ── Demo data (Superadmin) ──
export async function loadDemo() {
  const admin = await requirePlatformAdmin();
  await loadDemoData(prisma);
  await audit({ action: "admin.demo.loaded", userId: admin.id });
  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
}

export async function clearDemo() {
  const admin = await requirePlatformAdmin();
  await clearDemoData(prisma);
  await audit({ action: "admin.demo.cleared", userId: admin.id });
  revalidatePath("/admin");
  revalidatePath("/admin/tenants");
}

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

export async function setTenantPlan(id: string, formData: FormData) {
  const admin = await requirePlatformAdmin();
  const plan = String(formData.get("plan") || "");
  if (!["SOLO", "PRO", "TEAM", "BARBERSHOP", "ENTERPRISE"].includes(plan)) return;
  await prisma.tenant.update({ where: { id }, data: { plan: plan as Plan } });
  await audit({ action: "admin.tenant.plan", userId: admin.id, target: id, meta: { plan } });
  revalidatePath("/admin/tenants");
}

export async function toggleFeature(id: string, field: "featureSocial" | "featureAnalytics", value: boolean) {
  const admin = await requirePlatformAdmin();
  await prisma.tenant.update({ where: { id }, data: { [field]: value } });
  await audit({ action: "admin.tenant.feature", userId: admin.id, target: id, meta: { field, value } });
  revalidatePath("/admin/tenants");
}

// Account & permission management moved to Yggdrasil (fleet management plane)
// via the /api/yggdrasil/* bridge — the in-app Users/Roles console is retired.

/**
 * Permanently delete a store and ALL of its data (staff, services, clients,
 * appointments, etc. cascade). Irreversible. Requires the typed store name to match.
 */
export async function deleteStore(tenantId: string, formData: FormData) {
  const admin = await requirePlatformAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } });
  if (!tenant) return;

  // Safety: the typed confirmation must match the store name exactly.
  const confirmName = String(formData.get("confirmName") || "").trim();
  if (confirmName !== tenant.name) return;

  await prisma.tenant.delete({ where: { id: tenantId } });
  await audit({ action: "admin.store.deleted", userId: admin.id, target: tenant.slug, meta: { name: tenant.name } });
  revalidatePath("/admin/tenants");
  revalidatePath("/admin");
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
  revalidatePath("/admin");
}
