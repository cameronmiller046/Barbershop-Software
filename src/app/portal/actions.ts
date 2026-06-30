"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireTenantStaff, requireStaffWithPerms } from "@/lib/rbac";
import { can, type PermKey } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { AppointmentStatus } from "@prisma/client";

/** Load the acting staff member and confirm they hold a permission, else abort. */
async function requirePerm(key: PermKey) {
  const user = await requireStaffWithPerms();
  if (!can(user, key)) return null;
  return user;
}

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
  const user = await requirePerm("shop.clients");
  if (!user) return;
  const notes = String(formData.get("notes") || "");
  await prisma.client.updateMany({ where: { id, tenantId: user.tenantId }, data: { notes } });
  revalidatePath("/portal/clients");
}

// ── Services ──
export async function createService(formData: FormData) {
  const user = await requirePerm("shop.services");
  if (!user) return;
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
      imageUrl: String(formData.get("imageUrl") || "") || null,
    },
  });
  await audit({ action: "service.created", tenantId: user.tenantId, userId: user.id, target: name });
  revalidatePath("/portal/services");
}

/** Set or replace a service's photo (uploaded as a compressed data URL). */
export async function setServiceImage(id: string, formData: FormData) {
  const user = await requirePerm("shop.services");
  if (!user) return;
  const imageUrl = String(formData.get("imageUrl") || "") || null;
  await prisma.service.updateMany({ where: { id, tenantId: user.tenantId }, data: { imageUrl } });
  revalidatePath("/portal/services");
}

export async function toggleService(id: string, active: boolean) {
  const user = await requirePerm("shop.services");
  if (!user) return;
  await prisma.service.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  revalidatePath("/portal/services");
}

export async function deleteService(id: string) {
  const user = await requirePerm("shop.services");
  if (!user) return;
  await prisma.service.deleteMany({ where: { id, tenantId: user.tenantId } });
  revalidatePath("/portal/services");
}

// ── Team (requires the shop.team permission) ──
export async function createBarber(formData: FormData) {
  const user = await requirePerm("shop.team");
  if (!user) return;
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
  const user = await requirePerm("shop.team");
  if (!user) return;
  await prisma.user.updateMany({ where: { id, tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } }, data: { active } });
  revalidatePath("/portal/team");
}

// Edit a standard user's level within the shop (requires shop.team).
export async function setStaffRole(id: string, role: "BARBER" | "RECEPTIONIST") {
  const user = await requirePerm("shop.team");
  if (!user) return;
  await prisma.user.updateMany({
    where: { id, tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } },
    data: { role },
  });
  await audit({ action: "team.role", tenantId: user.tenantId, userId: user.id, target: id, meta: { role } });
  revalidatePath("/portal/team");
}

// ── Settings (requires the shop.settings permission) ──
export async function updateTenant(formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      tagline: String(formData.get("tagline") || "") || null,
      primaryColor: String(formData.get("primaryColor") || "#c9a24b"),
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      address: String(formData.get("address") || "") || null,
      monthlyGoalCents: Math.max(0, Math.round(Number(formData.get("monthlyGoal") || 0) * 100)),
    },
  });
  await audit({ action: "tenant.updated", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/settings");
  revalidatePath("/portal/reports");
}

// ── Account self-service (any signed-in staff edits their OWN account) ──
export async function updateOwnProfile(formData: FormData) {
  const user = await requireTenantStaff();
  const name = String(formData.get("name") || "").trim();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name || undefined, // display name — shown to customers + on booking
      bio: String(formData.get("bio") || "") || null,
      avatarUrl: String(formData.get("avatarUrl") || "") || null,
      instagramHandle: String(formData.get("instagramHandle") || "").replace(/^@/, "").trim() || null,
    },
  });
  await audit({ action: "account.updated", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/account");
  redirect("/portal/account?saved=1");
}

export async function changeOwnPassword(formData: FormData) {
  const user = await requireTenantStaff();
  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  if (next.length < 6) redirect("/portal/account?pw=short");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !(await bcrypt.compare(current, dbUser.passwordHash))) {
    redirect("/portal/account?pw=bad");
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  await audit({ action: "account.password", tenantId: user.tenantId, userId: user.id });
  redirect("/portal/account?pw=ok");
}

// ── Booking customization (Admins, requires shop.settings) ──
function hhmmToMin(v: string): number | null {
  if (!/^\d{1,2}:\d{2}$/.test(v)) return null;
  const [h, m] = v.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export async function updateBookingInterval(formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  const v = Math.max(5, Math.min(120, Number(formData.get("slotIntervalMin") || 30)));
  await prisma.tenant.update({ where: { id: user.tenantId }, data: { slotIntervalMin: v } });
  await audit({ action: "booking.interval", tenantId: user.tenantId, userId: user.id, meta: { slotIntervalMin: v } });
  revalidatePath("/portal/booking");
}

export async function updateBarberHours(barberId: string, formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  const barber = await prisma.user.findFirst({ where: { id: barberId, tenantId: user.tenantId } });
  if (!barber) return;

  for (let dow = 0; dow < 7; dow++) {
    const closed = formData.get(`closed_${dow}`) === "on";
    const startMin = hhmmToMin(String(formData.get(`open_${dow}`) || ""));
    const endMin = hhmmToMin(String(formData.get(`close_${dow}`) || ""));
    if (closed || startMin == null || endMin == null || endMin <= startMin) {
      await prisma.workingHour.deleteMany({ where: { barberId, dayOfWeek: dow } });
    } else {
      await prisma.workingHour.upsert({
        where: { barberId_dayOfWeek: { barberId, dayOfWeek: dow } },
        update: { startMin, endMin, tenantId: user.tenantId },
        create: { tenantId: user.tenantId, barberId, dayOfWeek: dow, startMin, endMin },
      });
    }
  }
  await audit({ action: "booking.hours", tenantId: user.tenantId, userId: user.id, target: barberId });
  revalidatePath("/portal/booking");
}
