"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMinutes } from "date-fns";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePortalStaff } from "@/lib/rbac";
import { can, type PermKey } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { isSlotFree } from "@/lib/availability";
import { RESCHEDULE_REASONS, CANCEL_REASONS, DELETE_REASONS, reasonToStatus } from "@/lib/appointmentReasons";
import { planLimits } from "@/lib/plans";
import { isDemoAccount } from "@/lib/demoMode";
import { computeClientDetail, CLIENT_DETAIL_INCLUDE } from "@/lib/clientDetail";
import { accrueLoyalty, loyaltyConfigOf, liveLoyaltyBalance, consumeLoyaltyReward, LOYALTY_SELECT, LOYALTY_MAX_REWARD_CENTS, LOYALTY_THRESHOLD_MAX } from "@/lib/loyalty";
import { isPaymentMethod } from "@/lib/payments";
import type { AppointmentStatus } from "@prisma/client";

/**
 * Load the acting staff member and confirm they hold a permission, else abort.
 * The public demo logins can run the day (appointments, walk-ins, client notes)
 * but MUST NOT persist changes to the shared showcase store's content, branding,
 * services, staff, or settings — otherwise a demo visitor edits the real public
 * store page. So we block every non-clients permission for demo accounts here.
 */
async function requirePerm(key: PermKey) {
  const user = await requirePortalStaff();
  if (!can(user, key)) return null;
  if (key !== "shop.clients" && isDemoAccount(user.email)) return null;
  return user;
}

// ── Appointments ──
export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  const user = await requirePortalStaff();
  // Ensure the appointment belongs to this tenant (isolation guard).
  const res = await prisma.appointment.updateMany({
    where: { id, tenantId: user.tenantId },
    data: { status },
  });
  if (res.count) await audit({ action: "appointment.status", tenantId: user.tenantId, userId: user.id, target: id, meta: { status } });
  revalidatePath("/portal/appointments");
  revalidatePath("/portal");
}

/** Load an appointment the acting staff may manage (own book, or all if manager). */
async function loadOwnedAppointment(id: string) {
  const user = await requirePortalStaff();
  const appt = await prisma.appointment.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { service: { select: { durationMin: true } } },
  });
  if (!appt) return null;
  if (!can(user, "shop.viewAll") && appt.barberId !== user.id) return null; // barbers: own only
  return { user, appt };
}

const revalidateAppointments = () => { revalidatePath("/portal/appointments"); revalidatePath("/portal"); revalidatePath("/portal/reports"); };

/** Move an appointment to a new time (same barber), with a required reason. */
export async function rescheduleAppointment(id: string, startISO: string, reason: string) {
  if (!(RESCHEDULE_REASONS as readonly string[]).includes(reason)) return;
  const ctx = await loadOwnedAppointment(id);
  if (!ctx) return;
  const { user, appt } = ctx;
  const start = new Date(startISO);
  if (isNaN(start.getTime()) || start < new Date()) return;
  const end = addMinutes(start, appt.service.durationMin);
  if (!(await isSlotFree(user.tenantId, appt.barberId, start, end, appt.id))) return;
  await prisma.appointment.update({
    where: { id }, data: { startTime: start, endTime: end, status: "CONFIRMED", statusReason: reason },
  });
  await audit({ action: "appointment.rescheduled", tenantId: user.tenantId, userId: user.id, target: id, meta: { reason, start: startISO } });
  revalidateAppointments();
}

/** Undo — fully reset an appointment to a fresh CONFIRMED state (clears the
 *  clock + collected amount so the check-in button comes back). */
export async function reopenAppointment(id: string) {
  const ctx = await loadOwnedAppointment(id);
  if (!ctx || !can(ctx.user, "shop.viewAll")) return; // managers/admins only — barbers can't reset the clock
  await prisma.appointment.update({
    where: { id },
    data: { status: "CONFIRMED", active: true, statusReason: null, checkedInAt: null, startedAt: null, finishedAt: null, collectedCents: null },
  });
  await audit({ action: "appointment.reopened", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id });
  revalidateAppointments();
}

/** Cancel (or mark no-show) with a required reason. */
export async function cancelAppointment(id: string, reason: string) {
  if (!(CANCEL_REASONS as readonly string[]).includes(reason)) return;
  const ctx = await loadOwnedAppointment(id);
  if (!ctx) return;
  const status = reasonToStatus(reason);
  await prisma.appointment.update({ where: { id }, data: { status, statusReason: reason } });
  await audit({ action: "appointment.cancelled", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id, meta: { reason, status } });
  revalidateAppointments();
}

/**
 * "Delete" an appointment — a SOFT delete. The row is never removed, so the
 * history (e.g. a no-show) is always on record in the client's timeline. It's
 * marked inactive (hidden from active views) with a required, logged reason.
 */
export async function deleteAppointment(id: string, reason: string) {
  if (!(DELETE_REASONS as readonly string[]).includes(reason)) return;
  const ctx = await loadOwnedAppointment(id);
  if (!ctx) return;
  const status = reasonToStatus(reason); // "No show" → NO_SHOW, else CANCELLED
  await prisma.appointment.update({ where: { id }, data: { active: false, status, statusReason: reason } });
  await audit({ action: "appointment.removed", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id, meta: { reason } });
  revalidateAppointments();
}

// ── Turnaround clock ──
const MIN_DURATION_MS = 5 * 60 * 1000; // 5-minute minimum so the clock can't be gamed

/** Mark the client as arrived and waiting (records checkedInAt). Does not start
 *  the cut clock — that's Start Service. */
export async function checkInAppointment(id: string) {
  const ctx = await loadOwnedAppointment(id);
  if (!ctx || ctx.appt.finishedAt || ctx.appt.startedAt) return;
  await prisma.appointment.update({ where: { id }, data: { checkedInAt: new Date(), status: "CONFIRMED", active: true } });
  await audit({ action: "appointment.checkedin", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id });
  revalidateAppointments();
}

/** Start the haircut clock (records startedAt). */
export async function startAppointment(id: string) {
  const ctx = await loadOwnedAppointment(id);
  if (!ctx || ctx.appt.finishedAt) return;
  await prisma.appointment.update({ where: { id }, data: { startedAt: new Date(), status: "CONFIRMED", active: true } });
  await audit({ action: "appointment.started", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id });
  revalidateAppointments();
}

/** Check out — finish + mark complete, recording what the barber collected, the
 *  tip, and the payment method. Turnaround is logged only if they checked in. */
export async function finishAppointment(id: string, collectedCents?: number, tipCents?: number, paymentMethod?: string) {
  const ctx = await loadOwnedAppointment(id);
  if (!ctx) return;
  const started = ctx.appt.startedAt;
  const finishedAt = started
    ? (Date.now() - started.getTime() < MIN_DURATION_MS ? new Date(started.getTime() + MIN_DURATION_MS) : new Date())
    : undefined;
  const method = paymentMethod && isPaymentMethod(paymentMethod) ? paymentMethod : undefined;
  await prisma.appointment.update({
    where: { id },
    data: {
      status: "COMPLETED",
      ...(finishedAt ? { finishedAt } : {}),
      ...(typeof collectedCents === "number" && collectedCents >= 0 ? { collectedCents: Math.round(collectedCents) } : {}),
      ...(typeof tipCents === "number" && tipCents >= 0 ? { tipCents: Math.round(tipCents) } : {}),
      ...(method ? { paymentMethod: method } : {}),
    },
  });
  await audit({ action: "appointment.finished", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id, meta: { collectedCents, tipCents, paymentMethod: method } });
  await accrueLoyalty(id); // idempotent; no-op unless the program is on
  revalidateAppointments();
}

/** Quickly log a completed cut (walk-in or appointment) for a new or existing
 *  client — so walk-in traffic gets into the system. Requires kind + referral. */
export async function logWalkIn(formData: FormData) {
  const user = await requirePortalStaff();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const serviceId = String(formData.get("serviceId") || "");
  const kind = String(formData.get("kind") || "");
  const referral = String(formData.get("referral") || "").trim();
  const collected = Number(formData.get("collected") || 0);
  const tip = Number(formData.get("tip") || 0);
  const pm = String(formData.get("paymentMethod") || "");
  if (!name || !serviceId || !referral) return;
  if (kind !== "WALKIN" && kind !== "APPOINTMENT") return;

  const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId: user.tenantId } });
  if (!service) return;

  // Reuse an existing client with the same name, else create one.
  const existing = await prisma.client.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: "insensitive" } } });
  const client = existing ?? (await prisma.client.create({ data: { tenantId: user.tenantId, name, phone: phone || null } }));

  const now = new Date();
  const walkIn = await prisma.appointment.create({
    data: {
      tenantId: user.tenantId, serviceId, barberId: user.id, clientId: client.id,
      startTime: now, endTime: new Date(now.getTime() + service.durationMin * 60000),
      status: "COMPLETED", kind, referral,
      collectedCents: collected > 0 ? Math.round(collected * 100) : service.priceCents,
      tipCents: tip > 0 ? Math.round(tip * 100) : null,
      paymentMethod: isPaymentMethod(pm) ? pm : null,
      startedAt: now, finishedAt: new Date(now.getTime() + Math.max(5, service.durationMin) * 60000),
    },
  });
  await accrueLoyalty(walkIn.id); // idempotent; no-op unless the program is on
  await audit({ action: "appointment.walkin", tenantId: user.tenantId, userId: user.id, meta: { kind, referral, newClient: !existing } });
  revalidateAppointments();
  revalidatePath("/portal/clients");
}

/** Append a timestamped note to an appointment (does not overwrite existing). */
export async function addAppointmentNote(id: string, note: string) {
  const ctx = await loadOwnedAppointment(id);
  if (!ctx) return;
  const t = note.trim();
  if (!t) return;
  const cur = await prisma.appointment.findUnique({ where: { id }, select: { notes: true } });
  const stamp = new Date().toLocaleString();
  const next = `${cur?.notes ? cur.notes + "\n" : ""}[${stamp}] ${t}`.slice(0, 4000);
  await prisma.appointment.update({ where: { id }, data: { notes: next } });
  await audit({ action: "appointment.note", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id });
  revalidateAppointments();
}

/** Admin correction of the clock — no 5-minute floor. Managers only. */
export async function correctAppointmentClock(id: string, startISO: string, finishISO: string) {
  const ctx = await loadOwnedAppointment(id);
  if (!ctx || !can(ctx.user, "shop.viewAll")) return; // managers/admins only
  const started = startISO ? new Date(startISO) : null;
  const finished = finishISO ? new Date(finishISO) : null;
  if (started && isNaN(started.getTime())) return;
  if (finished && isNaN(finished.getTime())) return;
  if (started && finished && finished < started) return;
  await prisma.appointment.update({
    where: { id },
    data: { startedAt: started, finishedAt: finished, ...(finished ? { status: "COMPLETED" as const } : {}) },
  });
  await audit({ action: "appointment.clock.corrected", tenantId: ctx.user.tenantId, userId: ctx.user.id, target: id });
  if (finished) await accrueLoyalty(id); // idempotent
  revalidateAppointments();
}

// ── Clients ──
export async function saveClientNotes(id: string, formData: FormData) {
  const user = await requirePerm("shop.clients");
  if (!user) return;
  const notes = String(formData.get("notes") || "");
  await prisma.client.updateMany({ where: { id, tenantId: user.tenantId }, data: { notes } });
  revalidatePath("/portal/clients");
}

/** Full detail for one client (loaded on selection in the Clients workspace). */
export async function clientDetail(clientId: string) {
  const user = await requirePerm("shop.clients");
  if (!user) return null;
  const [c, tenant] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId }, include: CLIENT_DETAIL_INCLUDE }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: LOYALTY_SELECT }),
  ]);
  if (!c) return null;
  const loyalty = tenant?.loyaltyEnabled ? { config: loyaltyConfigOf(tenant), points: await liveLoyaltyBalance(c.id) } : undefined;
  return computeClientDetail(c, Date.now(), loyalty);
}

/** Owner configures the loyalty program (requires shop.settings). */
export async function updateLoyalty(formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  const enabled = formData.get("loyaltyEnabled") === "on";
  const pointsPerVisit = Math.max(0, Math.min(1000, Math.round(Number(formData.get("pointsPerVisit") || 10))));
  const pointsPerDollar = Math.max(0, Math.min(100, Math.round(Number(formData.get("pointsPerDollar") || 0))));
  // Guardrails: a reward costs at most 100 points and is worth at most $10 off.
  const threshold = Math.max(1, Math.min(LOYALTY_THRESHOLD_MAX, Math.round(Number(formData.get("threshold") || 100))));
  const rewardLabel = (String(formData.get("rewardLabel") || "").trim() || "$10 off").slice(0, 60);
  const rewardValueCents = Math.max(0, Math.min(LOYALTY_MAX_REWARD_CENTS, Math.round(Number(formData.get("rewardValue") || 0) * 100)));
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { loyaltyEnabled: enabled, loyaltyPointsPerVisit: pointsPerVisit, loyaltyPointsPerDollar: pointsPerDollar, loyaltyThreshold: threshold, loyaltyRewardLabel: rewardLabel, loyaltyRewardValueCents: rewardValueCents },
  });
  await audit({ action: "loyalty.settings", tenantId: user.tenantId, userId: user.id, meta: { enabled, threshold, pointsPerVisit } });
  revalidatePath("/portal/settings");
  revalidatePath("/portal/clients");
}

/** Owner configures appointment reminders (requires shop.settings). */
export async function updateReminders(formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  const remindersEnabled = formData.get("remindersEnabled") === "on";
  const reminderEmail = formData.get("reminderEmail") === "on";
  const reminderSms = formData.get("reminderSms") === "on";
  const reminderHoursBefore = Math.max(1, Math.min(168, Math.round(Number(formData.get("reminderHoursBefore") || 24))));
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { remindersEnabled, reminderEmail, reminderSms, reminderHoursBefore },
  });
  await audit({ action: "reminders.settings", tenantId: user.tenantId, userId: user.id, meta: { remindersEnabled, reminderEmail, reminderSms, reminderHoursBefore } });
  revalidatePath("/portal/settings");
}

/** Redeem one loyalty reward for a client — consumes the threshold in points (FIFO, oldest first). */
export async function redeemLoyaltyReward(clientId: string) {
  const user = await requirePerm("shop.clients");
  if (!user) return;
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { loyaltyEnabled: true, loyaltyThreshold: true } });
  if (!tenant?.loyaltyEnabled) return;
  const threshold = Math.max(1, Math.min(LOYALTY_THRESHOLD_MAX, tenant.loyaltyThreshold));
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId }, select: { id: true } });
  if (!client) return;
  const ok = await consumeLoyaltyReward(client.id, threshold);
  if (!ok) return;
  await audit({ action: "loyalty.redeemed", tenantId: user.tenantId, userId: user.id, target: clientId, meta: { threshold } });
  revalidatePath("/portal/clients");
}

export async function createClient(formData: FormData) {
  const user = await requirePerm("shop.clients");
  if (!user) return;
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.client.create({
    data: {
      tenantId: user.tenantId, name,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim().toLowerCase() || null,
    },
  });
  await audit({ action: "client.created", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const user = await requirePerm("shop.clients");
  if (!user) return;
  const name = String(formData.get("name") || "").trim();
  await prisma.client.updateMany({
    where: { id, tenantId: user.tenantId },
    data: {
      name: name || undefined,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim().toLowerCase() || null,
    },
  });
  await audit({ action: "client.updated", tenantId: user.tenantId, userId: user.id, target: id });
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

/** Set a service photo's focal point ("X% Y%") so it centers on the subject. */
export async function setServiceImagePosition(id: string, formData: FormData) {
  const user = await requirePerm("shop.services");
  if (!user) return;
  const raw = String(formData.get("position") || "").trim();
  if (!/^\d{1,3}% \d{1,3}%$/.test(raw)) return;
  await prisma.service.updateMany({ where: { id, tenantId: user.tenantId }, data: { imagePosition: raw } });
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

  // Enforce the plan's chair limit (kiosk device logins don't take a chair).
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plan: true } });
  const count = await prisma.user.count({ where: { tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] }, kioskOnly: false } });
  if (tenant && count >= planLimits(tenant.plan).maxBarbers) redirect("/portal/team?err=limit");

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

// Admin sets a barber's photo (requires shop.team). Separate action so it can
// live outside the profile <form> (nested forms are invalid).
export async function setStaffAvatar(id: string, formData: FormData) {
  const user = await requirePerm("shop.team");
  if (!user) return;
  const target = await prisma.user.findFirst({
    where: { id, tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } },
  });
  if (!target) return;
  await prisma.user.update({ where: { id: target.id }, data: { avatarUrl: String(formData.get("imageUrl") || "") || null } });
  await audit({ action: "team.avatar", tenantId: user.tenantId, userId: user.id, target: target.id });
  revalidatePath("/portal/team");
}

// Admin edits a staff member's profile + HR fields (requires shop.team).
export async function updateStaffProfile(id: string, formData: FormData) {
  const user = await requirePerm("shop.team");
  if (!user) return;
  const target = await prisma.user.findFirst({
    where: { id, tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } },
  });
  if (!target) return;

  const name = String(formData.get("name") || "").trim();
  const hire = String(formData.get("hireDate") || "");
  const dob = String(formData.get("dateOfBirth") || "");
  const parseDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null);

  await prisma.user.update({
    where: { id: target.id },
    data: {
      name: name || undefined,
      bio: String(formData.get("bio") || "") || null,
      instagramHandle: String(formData.get("instagramHandle") || "").replace(/^@/, "").trim() || null,
      hireDate: parseDate(hire),
      dateOfBirth: parseDate(dob),
    },
  });
  await audit({ action: "team.profile", tenantId: user.tenantId, userId: user.id, target: target.id });
  revalidatePath("/portal/team");
}

/** Restrict (or release) a staff account to the self-check-in kiosk only. When
 *  on, that login can only ever reach /kiosk — used for a shared front-desk
 *  tablet. Requires shop.team. */
export async function setKioskMode(id: string, on: boolean) {
  const user = await requirePerm("shop.team");
  if (!user) return;
  await prisma.user.updateMany({
    where: { id, tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] } },
    data: { kioskOnly: on },
  });
  await audit({ action: "team.kioskMode", tenantId: user.tenantId, userId: user.id, target: id, meta: { on } });
  revalidatePath("/portal/team");
}

/** Create a dedicated check-in kiosk device login (locked to /kiosk). Does not
 *  count against the plan's chair limit and isn't a bookable barber. */
export async function createKioskAccount(formData: FormData) {
  const user = await requirePerm("shop.team");
  if (!user) return;
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const label = String(formData.get("name") || "").trim() || "Front desk kiosk";
  if (!email || password.length < 6) redirect("/portal/team?kioskErr=fields");
  if (await prisma.user.findUnique({ where: { email } })) redirect("/portal/team?kioskErr=email");
  await prisma.user.create({
    data: {
      tenantId: user.tenantId,
      email,
      name: label,
      role: "RECEPTIONIST",
      kioskOnly: true,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await audit({ action: "kiosk.account.created", tenantId: user.tenantId, userId: user.id, target: email });
  revalidatePath("/portal/team");
  redirect("/portal/team?kiosk=created");
}

/** Permanently remove a kiosk device login (only kiosk-only accounts). */
export async function deleteKioskAccount(id: string) {
  const user = await requirePerm("shop.team");
  if (!user) return;
  await prisma.user.deleteMany({ where: { id, tenantId: user.tenantId, kioskOnly: true } });
  await audit({ action: "kiosk.account.removed", tenantId: user.tenantId, userId: user.id, target: id });
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
  const hex = (v: FormDataEntryValue | null, fallback: string) => {
    const s = String(v || "").trim();
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : fallback;
  };
  const primary = hex(formData.get("primaryColor"), "#c9a24b");
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      tagline: String(formData.get("tagline") || "") || null,
      primaryColor: primary,
      secondaryColor: hex(formData.get("secondaryColor"), primary),
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

// Admin sets one of the shop's images (requires shop.settings).
export async function setTenantImage(field: "logoUrl" | "heroImageUrl" | "faviconUrl" | "coverImageUrl", formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { [field]: String(formData.get("imageUrl") || "") || null },
  });
  await audit({ action: "tenant.image", tenantId: user.tenantId, userId: user.id, meta: { field } });
  revalidatePath("/portal/settings");
  revalidatePath("/portal/website");
}

// Admin sets the hero photo focal point ("X% Y%"), requires shop.settings.
export async function setHeroPosition(formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  const raw = String(formData.get("position") || "").trim();
  if (!/^\d{1,3}% \d{1,3}%$/.test(raw)) return;
  await prisma.tenant.update({ where: { id: user.tenantId }, data: { heroImagePosition: raw } });
  await audit({ action: "tenant.heroPosition", tenantId: user.tenantId, userId: user.id, meta: { position: raw } });
  revalidatePath("/portal/settings");
}

// ── Website Content CMS (requires shop.settings) — drives the public storefront ──
const cmsStr = (formData: FormData, k: string, max = 2000) => { const v = String(formData.get(k) || "").trim(); return v ? v.slice(0, max) : null; };

/** Save all Website Content (one tabbed form → whole storefront updates live). */
export async function updateWebsiteContent(formData: FormData) {
  const user = await requirePerm("shop.settings");
  if (!user) return;
  const s = String(formData.get("accentColor") || "").trim();
  const accent = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ? s : null;
  const on = (k: string) => formData.get(k) === "on";
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      tagline: cmsStr(formData, "tagline", 200),
      description: cmsStr(formData, "description", 4000),
      website: cmsStr(formData, "website", 300),
      phone: cmsStr(formData, "phone", 40),
      email: cmsStr(formData, "email", 200),
      address: cmsStr(formData, "address", 300),
      heroHeadline: cmsStr(formData, "heroHeadline", 120),
      heroSubheading: cmsStr(formData, "heroSubheading", 300),
      heroCtaText: cmsStr(formData, "heroCtaText", 40),
      announcement: cmsStr(formData, "announcement", 200),
      instagramUrl: cmsStr(formData, "instagramUrl", 300),
      facebookUrl: cmsStr(formData, "facebookUrl", 300),
      tiktokUrl: cmsStr(formData, "tiktokUrl", 300),
      xUrl: cmsStr(formData, "xUrl", 300),
      youtubeUrl: cmsStr(formData, "youtubeUrl", 300),
      metaTitle: cmsStr(formData, "metaTitle", 120),
      metaDescription: cmsStr(formData, "metaDescription", 320),
      accentColor: accent,
      showBarbers: on("showBarbers"), showGallery: on("showGallery"), showReviews: on("showReviews"), showFaq: on("showFaq"),
    },
  });
  await audit({ action: "website.content", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/website");
  revalidatePath("/portal/settings");
  redirect("/portal/website?saved=1");
}

// ── Account self-service (any signed-in staff edits their OWN account) ──
export async function updateOwnProfile(formData: FormData) {
  const user = await requirePortalStaff();
  if (isDemoAccount(user.email)) redirect("/portal/account?demo=1"); // demo profile shows on the public store — don't persist
  const name = String(formData.get("name") || "").trim();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name || undefined, // display name — shown to customers + on booking
      bio: String(formData.get("bio") || "") || null,
      avatarUrl: String(formData.get("avatarUrl") || "") || null,
      instagramHandle: String(formData.get("instagramHandle") || "").replace(/^@/, "").trim() || null,
      facebookUrl: String(formData.get("facebookUrl") || "").trim() || null,
      tiktokUrl: String(formData.get("tiktokUrl") || "").trim() || null,
      xUrl: String(formData.get("xUrl") || "").trim() || null,
      youtubeUrl: String(formData.get("youtubeUrl") || "").trim() || null,
    },
  });
  await audit({ action: "account.updated", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/account");
  redirect("/portal/account?saved=1");
}

export async function changeOwnPassword(formData: FormData) {
  const user = await requirePortalStaff();
  if (isDemoAccount(user.email)) redirect("/portal/account?demo=1"); // never let a visitor change the shared demo password
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
