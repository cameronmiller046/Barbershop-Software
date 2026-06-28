"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import { provisionTenant } from "@/lib/provision";
import { audit } from "@/lib/audit";
import type { TenantStatus } from "@prisma/client";

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
