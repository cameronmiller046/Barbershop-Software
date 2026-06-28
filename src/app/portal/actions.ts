"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireTenantStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import type { AppointmentStatus, SocialPlatform, SocialStatus } from "@prisma/client";

// ── Appointments ──
export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  const user = await requireTenantStaff();
  // Ensure the appointment belongs to this tenant (isolation guard).
  const res = await prisma.appointment.updateMany({
    where: { id, tenantId: user.tenantId },
    data: { status },
  });
  if (res.count) await audit({ action: "appointment.status", tenantId: user.tenantId, userId: user.id, target: id, meta: { status } });
  revalidatePath("/portal/appointments");
  revalidatePath("/portal");
}

// ── Clients ──
export async function saveClientNotes(id: string, formData: FormData) {
  const user = await requireTenantStaff();
  const notes = String(formData.get("notes") || "");
  await prisma.client.updateMany({ where: { id, tenantId: user.tenantId }, data: { notes } });
  revalidatePath("/portal/clients");
}

// ── Services ──
export async function createService(formData: FormData) {
  const user = await requireTenantStaff();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.service.create({
    data: {
      tenantId: user.tenantId,
      name,
      description: String(formData.get("description") || "") || null,
      durationMin: Math.max(5, Number(formData.get("durationMin") || 30)),
      priceCents: Math.max(0, Math.round(Number(formData.get("price") || 0) * 100)),
      barberId: (String(formData.get("barberId") || "") || null) as string | null,
    },
  });
  await audit({ action: "service.created", tenantId: user.tenantId, userId: user.id, target: name });
  revalidatePath("/portal/services");
}

export async function toggleService(id: string, active: boolean) {
  const user = await requireTenantStaff();
  await prisma.service.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  revalidatePath("/portal/services");
}

export async function deleteService(id: string) {
  const user = await requireTenantStaff();
  await prisma.service.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/portal/services");
}

// ── Social planner ──
export async function createSocialPost(formData: FormData) {
  const user = await requireTenantStaff();
  const caption = String(formData.get("caption") || "").trim();
  if (!caption) return;
  const platforms = formData.getAll("platforms").map(String) as SocialPlatform[];
  const scheduledRaw = String(formData.get("scheduledFor") || "");
  await prisma.socialPost.create({
    data: {
      tenantId: user.tenantId,
      barberId: user.id,
      caption,
      imageUrl: String(formData.get("imageUrl") || "") || null,
      platforms,
      status: (String(formData.get("status") || "IDEA")) as SocialStatus,
      scheduledFor: scheduledRaw ? new Date(scheduledRaw) : null,
    },
  });
  revalidatePath("/portal/social");
}

export async function setSocialStatus(id: string, status: SocialStatus) {
  const user = await requireTenantStaff();
  await prisma.socialPost.updateMany({ where: { id, tenantId: user.tenantId }, data: { status } });
  revalidatePath("/portal/social");
}

export async function deleteSocialPost(id: string) {
  const user = await requireTenantStaff();
  await prisma.socialPost.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/portal/social");
}

// ── Team (owner only) ──
export async function createBarber(formData: FormData) {
  const user = await requireTenantStaff();
  if (user.role !== "OWNER") return;
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !name || password.length < 6) return;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;
  const created = await prisma.user.create({
    data: {
      tenantId: user.tenantId,
      email,
      name,
      role: (String(formData.get("role") || "BARBER")) === "RECEPTIONIST" ? "RECEPTIONIST" : "BARBER",
      passwordHash: await bcrypt.hash(password, 10),
      bio: String(formData.get("bio") || "") || null,
    },
  });
  // Default weekday hours so the new barber is bookable.
  if (created.role === "BARBER") {
    await prisma.workingHour.createMany({
      data: [1, 2, 3, 4, 5].map((dow) => ({ tenantId: user.tenantId, barberId: created.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 18 * 60 })),
    });
  }
  await audit({ action: "team.created", tenantId: user.tenantId, userId: user.id, target: email });
  revalidatePath("/portal/team");
}

export async function toggleBarber(id: string, active: boolean) {
  const user = await requireTenantStaff();
  if (user.role !== "OWNER") return;
  await prisma.user.updateMany({ where: { id, tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } }, data: { active } });
  revalidatePath("/portal/team");
}

// ── Settings (owner only) ──
export async function updateTenant(formData: FormData) {
  const user = await requireTenantStaff();
  if (user.role !== "OWNER") return;
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      tagline: String(formData.get("tagline") || "") || null,
      primaryColor: String(formData.get("primaryColor") || "#c9a24b"),
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      address: String(formData.get("address") || "") || null,
    },
  });
  await audit({ action: "tenant.updated", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/settings");
}
