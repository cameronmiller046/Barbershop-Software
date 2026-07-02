"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireKioskStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { nextFreeStart, isSlotFree } from "@/lib/availability";
import { REFERRAL_TYPES } from "@/lib/appointmentMeta";
import type { KioskClient, BarberOption } from "@/lib/kioskTypes";

const digitsOf = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

// Kiosks are shared screens, so we never show full contact details in search
// results — just enough for the client to recognise their own record.
function maskPhone(phone: string | null): string | null {
  const d = digitsOf(phone);
  if (!phone) return null;
  return d.length >= 4 ? `•••-${d.slice(-4)}` : "•••";
}
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [u, host] = email.split("@");
  if (!host) return "•••";
  return `${u.slice(0, 1)}•••@${host}`;
}

/**
 * Search this shop's client registry by phone, email, or name. Matching is done
 * in memory so phone formatting differences don't cause misses (e.g. searching
 * "5551234" finds "(555) 123-4…"). Capped to the acting tenant.
 */
export async function kioskSearchClients(query: string): Promise<KioskClient[]> {
  const user = await requireKioskStaff();
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  const digits = digitsOf(q);

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { updatedAt: "desc" },
    take: 2000,
  });

  const matched = clients
    .filter((c) => {
      if (digits.length >= 3 && digitsOf(c.phone).includes(digits)) return true;
      return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    })
    .slice(0, 6);
  if (matched.length === 0) return [];

  const last = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { tenantId: user.tenantId, clientId: { in: matched.map((c) => c.id) } },
    _max: { startTime: true },
  });
  const lastByClient = new Map(last.map((l) => [l.clientId, l._max.startTime]));

  return matched.map((c) => ({
    id: c.id,
    name: c.name,
    phoneMasked: maskPhone(c.phone),
    emailMasked: maskEmail(c.email),
    lastVisit: lastByClient.get(c.id)?.toISOString() ?? null,
  }));
}

/**
 * Register a new client from the kiosk (or reuse an existing record with the
 * same phone/email so the registry stays de-duplicated). First + last name and
 * a phone are required; email + address are optional.
 */
export async function kioskRegisterClient(input: {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
}): Promise<{ id: string; name: string } | { error: string }> {
  const user = await requireKioskStaff();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = input.phone.trim();
  const email = (input.email || "").trim().toLowerCase();
  const address = (input.address || "").trim();

  if (!firstName || !lastName) return { error: "Please enter your first and last name." };
  const digits = digitsOf(phone);
  if (digits.length < 7) return { error: "Please enter a valid phone number." };

  const name = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();

  const all = await prisma.client.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true, address: true },
    take: 2000,
  });
  // This person tapped "I'm new here", so match conservatively to avoid checking
  // them in under someone else's record. Email is a strong identifier; a phone
  // match must ALSO agree on the name (phones get shared / mistyped).
  const normName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const emailMatch = email ? all.find((c) => (c.email || "").toLowerCase() === email) : undefined;
  const phoneMatch = !emailMatch && digits
    ? all.find((c) => digitsOf(c.phone) === digits && normName(c.name) === normName(name))
    : undefined;
  const existing = emailMatch ?? phoneMatch;

  if (existing) {
    // Same person — don't overwrite an established identity from a kiosk re-entry
    // (could be a typo). Only backfill missing contact info, and keep the display
    // name and its structured parts consistent.
    const parts = existing.name.trim().split(/\s+/);
    const client = await prisma.client.update({
      where: { id: existing.id },
      data: {
        firstName: existing.firstName ?? parts[0] ?? null,
        lastName: existing.lastName ?? (parts.length > 1 ? parts.slice(1).join(" ") : null),
        phone: existing.phone || phone,
        email: existing.email || (email || null),
        address: existing.address || (address || null),
      },
      select: { id: true, name: true },
    });
    return { id: client.id, name: client.name };
  }

  const client = await prisma.client.create({
    data: {
      tenantId: user.tenantId,
      firstName,
      lastName,
      name,
      phone,
      email: email || null,
      address: address || null,
    },
    select: { id: true, name: true },
  });
  await audit({ action: "kiosk.client.registered", tenantId: user.tenantId, userId: user.id, target: client.id });
  return { id: client.id, name: client.name };
}

/** Per-barber estimated wait for a given service (drives the "choose a barber" screen). */
export async function kioskBarberOptions(serviceId: string): Promise<BarberOption[]> {
  const user = await requireKioskStaff();
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: user.tenantId, active: true },
    select: { durationMin: true },
  });
  if (!service) return [];
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { timezone: true } });
  const tz = tenant?.timezone || "America/New_York";

  const barbers = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: "BARBER", active: true, kioskOnly: false },
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
  const now = Date.now();
  return Promise.all(
    barbers.map(async (b) => {
      const start = await nextFreeStart(user.tenantId, b.id, service.durationMin, 5, tz);
      return {
        id: b.id,
        name: b.name,
        avatarUrl: b.avatarUrl,
        etaMin: start ? Math.max(0, Math.round((start.getTime() - now) / 60000)) : null,
      };
    }),
  );
}

/**
 * Check a client in as a walk-in. Creates a CONFIRMED walk-in appointment at the
 * barber's soonest free time (so it flows through the normal barber check-in →
 * checkout clock). If no barber is chosen, picks whoever is free soonest.
 */
export async function kioskCheckIn(input: {
  clientId: string;
  serviceId: string;
  barberId?: string | null;
  referral?: string;
}): Promise<
  | { ok: true; barberName: string; etaMin: number; position: number; startISO: string; serviceName: string }
  | { ok: false; error: string }
> {
  const user = await requireKioskStaff();

  const [client, service, tenant] = await Promise.all([
    prisma.client.findFirst({ where: { id: input.clientId, tenantId: user.tenantId }, select: { id: true } }),
    prisma.service.findFirst({
      where: { id: input.serviceId, tenantId: user.tenantId, active: true },
      select: { id: true, name: true, durationMin: true },
    }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { timezone: true } }),
  ]);
  if (!client) return { ok: false, error: "We couldn't find your record. Please start over." };
  if (!service) return { ok: false, error: "That service is unavailable. Please pick another." };
  const tz = tenant?.timezone || "America/New_York";

  const barbers = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: "BARBER", active: true, kioskOnly: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" }, // deterministic pick
  });
  if (barbers.length === 0) return { ok: false, error: "No barbers are available right now — please see the front desk." };

  let chosenId = input.barberId || null;
  if (chosenId && !barbers.some((b) => b.id === chosenId)) chosenId = null;

  // Resolve the barber + their soonest genuinely-free start.
  let barberId: string;
  let start: Date | null;
  if (chosenId) {
    barberId = chosenId;
    start = await nextFreeStart(user.tenantId, chosenId, service.durationMin, 5, tz);
  } else {
    const withStarts = await Promise.all(
      barbers.map(async (b) => ({ b, start: await nextFreeStart(user.tenantId, b.id, service.durationMin, 5, tz) })),
    );
    const available = withStarts
      .filter((x): x is { b: (typeof barbers)[number]; start: Date } => x.start !== null)
      .sort((a, b2) => a.start.getTime() - b2.start.getTime());
    if (available.length === 0) {
      return { ok: false, error: "No barbers are free right now — please see the front desk." };
    }
    barberId = available[0].b.id;
    start = available[0].start;
  }
  // Never fabricate a "now" slot — if the barber has no availability, say so
  // instead of stacking a walk-in on top of an in-progress cut.
  if (!start) {
    return { ok: false, error: "That barber has no openings right now — please pick another or see the front desk." };
  }

  const now = new Date();
  const referral =
    input.referral && (REFERRAL_TYPES as readonly string[]).includes(input.referral)
      ? input.referral
      : "Returning customer";

  // Commit at the soonest free slot, re-checking it's still open immediately
  // before the write (a walk-in or online booking may have taken it) and
  // retrying a couple of times — mirroring the public booking path.
  let startTime = start;
  let created = false;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const endTime = new Date(startTime.getTime() + service.durationMin * 60000);
    if (await isSlotFree(user.tenantId, barberId, startTime, endTime)) {
      await prisma.appointment.create({
        data: {
          tenantId: user.tenantId,
          serviceId: service.id,
          barberId,
          clientId: client.id,
          startTime,
          endTime,
          status: "CONFIRMED",
          kind: "WALKIN",
          referral,
        },
      });
      created = true;
      break;
    }
    const retry = await nextFreeStart(user.tenantId, barberId, service.durationMin, 5, tz);
    if (!retry) break;
    startTime = retry;
  }
  if (!created) {
    return { ok: false, error: "That time was just taken — please try again." };
  }

  // "Ahead of you" = this barber's other unfinished confirmed jobs before your start.
  const ahead = await prisma.appointment.count({
    where: {
      tenantId: user.tenantId,
      barberId,
      active: true,
      status: "CONFIRMED",
      endTime: { gt: now },
      startTime: { lt: startTime },
    },
  });
  const barberName = barbers.find((b) => b.id === barberId)?.name ?? "your barber";
  const etaMin = Math.max(0, Math.round((startTime.getTime() - now.getTime()) / 60000));

  await audit({
    action: "kiosk.checkin",
    tenantId: user.tenantId,
    userId: user.id,
    target: client.id,
    meta: { barberId, serviceId: service.id, chosen: !!chosenId },
  });
  revalidatePath("/portal");
  revalidatePath("/portal/appointments");

  return { ok: true, barberName, etaMin, position: ahead + 1, startISO: startTime.toISOString(), serviceName: service.name };
}
