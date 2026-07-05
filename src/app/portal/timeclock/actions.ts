"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePortalStaff, requireStaffWithPerms } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";

const revalidate = () => { revalidatePath("/portal/timeclock"); revalidatePath("/portal"); };

/** Clock the acting staff member IN (no-op if already on the clock). */
export async function clockIn() {
  const user = await requirePortalStaff();
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId: user.id, clockOut: null } });
  if (open) return;
  await prisma.timeEntry.create({ data: { tenantId: user.tenantId, userId: user.id, clockIn: new Date() } });
  await audit({ action: "timeclock.in", tenantId: user.tenantId, userId: user.id });
  revalidate();
}

/** Clock the acting staff member OUT (closes their open shift). */
export async function clockOut() {
  const user = await requirePortalStaff();
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId: user.id, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) return;
  await prisma.timeEntry.update({ where: { id: open.id }, data: { clockOut: new Date() } });
  await audit({ action: "timeclock.out", tenantId: user.tenantId, userId: user.id });
  revalidate();
}

/** Manager clocks out a staff member who forgot (requires shop.team). */
export async function clockOutStaff(userId: string) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.team")) return;
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) return;
  await prisma.timeEntry.update({ where: { id: open.id }, data: { clockOut: new Date() } });
  await audit({ action: "timeclock.out.admin", tenantId: user.tenantId, userId: user.id, target: userId });
  revalidate();
}
