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

/** Clock the acting staff member OUT (closes their open shift + any open break). */
export async function clockOut() {
  const user = await requirePortalStaff();
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId: user.id, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) return;
  const now = new Date();
  await prisma.timeBreak.updateMany({ where: { entryId: open.id, end: null }, data: { end: now } });
  await prisma.timeEntry.update({ where: { id: open.id }, data: { clockOut: now } });
  await audit({ action: "timeclock.out", tenantId: user.tenantId, userId: user.id });
  revalidate();
}

/** Start an (unpaid) break on the acting staff member's open shift. */
export async function startBreak() {
  const user = await requirePortalStaff();
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId: user.id, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) return; // must be on the clock to take a break
  const onBreak = await prisma.timeBreak.findFirst({ where: { entryId: open.id, end: null } });
  if (onBreak) return; // already on break
  await prisma.timeBreak.create({ data: { tenantId: user.tenantId, userId: user.id, entryId: open.id } });
  await audit({ action: "timeclock.break.start", tenantId: user.tenantId, userId: user.id, target: open.id });
  revalidate();
}

/** End the acting staff member's current break (returns them to the clock). */
export async function endBreak() {
  const user = await requirePortalStaff();
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId: user.id, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) return;
  await prisma.timeBreak.updateMany({ where: { entryId: open.id, end: null }, data: { end: new Date() } });
  await audit({ action: "timeclock.break.end", tenantId: user.tenantId, userId: user.id, target: open.id });
  revalidate();
}

/** Manager clocks out a staff member who forgot (requires shop.team). */
export async function clockOutStaff(userId: string) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.team")) return;
  const open = await prisma.timeEntry.findFirst({ where: { tenantId: user.tenantId, userId, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) return;
  const now = new Date();
  await prisma.timeBreak.updateMany({ where: { entryId: open.id, end: null }, data: { end: now } });
  await prisma.timeEntry.update({ where: { id: open.id }, data: { clockOut: now } });
  await audit({ action: "timeclock.out.admin", tenantId: user.tenantId, userId: user.id, target: userId });
  revalidate();
}

const parseLocal = (v: FormDataEntryValue | null): Date | null => {
  const s = String(v || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** A barber suggests a correction to ONE of their own shifts (goes to admins). */
export async function suggestTimeEdit(entryId: string, formData: FormData) {
  const user = await requirePortalStaff();
  const entry = await prisma.timeEntry.findFirst({ where: { id: entryId, tenantId: user.tenantId, userId: user.id } });
  if (!entry) return; // only your own entry
  const proposedClockIn = parseLocal(formData.get("clockIn"));
  const proposedClockOut = parseLocal(formData.get("clockOut"));
  const reason = String(formData.get("reason") || "").trim().slice(0, 500) || null;
  if (!proposedClockIn && !proposedClockOut) return;
  if (proposedClockIn && proposedClockOut && proposedClockOut < proposedClockIn) return;
  // Replace any existing pending request for this entry.
  await prisma.timeEditRequest.deleteMany({ where: { entryId, status: "PENDING" } });
  await prisma.timeEditRequest.create({
    data: { tenantId: user.tenantId, entryId, userId: user.id, proposedClockIn, proposedClockOut, reason },
  });
  await audit({ action: "timeclock.edit.suggested", tenantId: user.tenantId, userId: user.id, target: entryId });
  revalidate();
}

/** Admin approves a suggested edit — applies the proposed times (requires shop.team). */
export async function approveTimeEdit(requestId: string) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.team")) return;
  const req = await prisma.timeEditRequest.findFirst({ where: { id: requestId, tenantId: user.tenantId, status: "PENDING" } });
  if (!req) return;
  await prisma.timeEntry.update({
    where: { id: req.entryId },
    data: {
      ...(req.proposedClockIn ? { clockIn: req.proposedClockIn } : {}),
      ...(req.proposedClockOut ? { clockOut: req.proposedClockOut } : {}),
    },
  });
  await prisma.timeEditRequest.update({ where: { id: req.id }, data: { status: "APPROVED", resolvedAt: new Date(), resolvedById: user.id } });
  await audit({ action: "timeclock.edit.approved", tenantId: user.tenantId, userId: user.id, target: req.entryId });
  revalidate();
}

/** Admin rejects a suggested edit (requires shop.team). */
export async function rejectTimeEdit(requestId: string) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.team")) return;
  await prisma.timeEditRequest.updateMany({
    where: { id: requestId, tenantId: user.tenantId, status: "PENDING" },
    data: { status: "REJECTED", resolvedAt: new Date(), resolvedById: user.id },
  });
  await audit({ action: "timeclock.edit.rejected", tenantId: user.tenantId, userId: user.id, target: requestId });
  revalidate();
}
