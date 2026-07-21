import { prisma } from "@/lib/prisma";
import { addMinutes, addDays } from "date-fns";

export type Slot = { start: string; end: string; barberId?: string };

// ── Timezone helpers (shop hours are wall-clock in the shop's timezone) ──

/** The shop-local calendar date (Y, M0, D, weekday) for an instant. */
function zonedYmd(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(get("year")), month0: Number(get("month")) - 1, day: Number(get("day")), weekday: wdMap[get("weekday")] ?? 0 };
}

/** Convert a wall-clock time (shop-local Y/M0/D + minutes) into a UTC instant. */
function zonedWallToUtc(year: number, month0: number, day: number, minutes: number, timeZone: string): Date {
  const h = Math.floor(minutes / 60);
  const mi = minutes % 60;
  const guess = Date.UTC(year, month0, day, h, mi);
  // See how that UTC instant reads in the shop timezone, then correct the delta.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const seenAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return new Date(guess - (seenAsUtc - guess));
}

/**
 * Bookable slots for a barber + service on a shop-local date, in the shop's
 * timezone. Slots fit fully inside the working window, avoid clashes, and are
 * never in the past.
 */
export async function getDaySlots(
  tenantId: string,
  barberId: string,
  serviceDurationMin: number,
  date: Date,
  stepMin = 15,
  timeZone = "America/New_York",
): Promise<Slot[]> {
  const { year, month0, day, weekday } = zonedYmd(date, timeZone);

  const wh = await prisma.workingHour.findUnique({
    where: { barberId_dayOfWeek: { barberId, dayOfWeek: weekday } },
  });
  if (!wh || wh.tenantId !== tenantId) return [];

  const windowStart = zonedWallToUtc(year, month0, day, wh.startMin, timeZone);
  const windowEnd = zonedWallToUtc(year, month0, day, wh.endMin, timeZone);

  // Any appointment that OVERLAPS the window — including one that began before
  // it opens but is still running (matches the isSlotFree predicate). A narrower
  // "startTime within window" filter would miss an in-progress cut.
  const existing = await prisma.appointment.findMany({
    where: {
      tenantId, barberId, active: true, status: "CONFIRMED",
      startTime: { lt: windowEnd },
      endTime: { gt: windowStart },
    },
    select: { startTime: true, endTime: true },
  });

  const slots: Slot[] = [];
  const step = Math.max(5, stepMin);
  const now = new Date();
  let cursor = windowStart;
  while (cursor.getTime() + serviceDurationMin * 60000 <= windowEnd.getTime()) {
    const slotEnd = addMinutes(cursor, serviceDurationMin);
    const inPast = cursor.getTime() <= now.getTime();
    const overlaps = existing.some((a) => cursor < a.endTime && slotEnd > a.startTime);
    if (!inPast && !overlaps) slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString(), barberId });
    cursor = addMinutes(cursor, step);
  }
  return slots;
}

/** Next N shop-local days that have at least one open slot. */
export async function getUpcomingDays(
  tenantId: string,
  barberId: string,
  serviceDurationMin: number,
  days = 21,
  stepMin = 15,
  timeZone = "America/New_York",
) {
  // Bookable slots are spaced at least 30 min apart so a barber can hold at most
  // one appointment per 30-minute block (walk-in check-in still uses fine steps).
  const step = Math.max(30, stepMin);
  const result: { date: string; slots: Slot[] }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(new Date(), i);
    const slots = await getDaySlots(tenantId, barberId, serviceDurationMin, d, step, timeZone);
    if (slots.length) {
      // Label with the shop-local midnight so the client renders the right day.
      const { year, month0, day } = zonedYmd(d, timeZone);
      result.push({ date: zonedWallToUtc(year, month0, day, 0, timeZone).toISOString(), slots });
    }
  }
  return result;
}

/**
 * "No preference" availability: the union of open slots across several barbers.
 * Each returned slot is tagged with a barberId who is actually free at that time
 * (first free barber wins), so booking assigns the right person. Every slot still
 * comes from a barber's real working hours and open time — nothing is invented.
 */
export async function getUpcomingDaysAnyBarber(
  tenantId: string,
  barberIds: string[],
  serviceDurationMin: number,
  days = 21,
  stepMin = 15,
  timeZone = "America/New_York",
) {
  const step = Math.max(30, stepMin); // ≥30-min spacing → 1 appointment per 30-min block
  const result: { date: string; slots: Slot[] }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(new Date(), i);
    const byStart = new Map<string, Slot>();
    for (const barberId of barberIds) {
      const slots = await getDaySlots(tenantId, barberId, serviceDurationMin, d, step, timeZone);
      for (const s of slots) if (!byStart.has(s.start)) byStart.set(s.start, s);
    }
    if (byStart.size) {
      const slots = [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
      const { year, month0, day } = zonedYmd(d, timeZone);
      result.push({ date: zonedWallToUtc(year, month0, day, 0, timeZone).toISOString(), slots });
    }
  }
  return result;
}

/**
 * The soonest instant a barber can start a service of `serviceDurationMin`,
 * respecting their working hours and existing bookings. Scans forward from now
 * across up to `scanDays` days. Returns null if they have no availability at all
 * (e.g. no working hours). Used to queue walk-ins from the self-check-in kiosk.
 */
export async function nextFreeStart(
  tenantId: string,
  barberId: string,
  serviceDurationMin: number,
  stepMin = 5,
  timeZone = "America/New_York",
  scanDays = 14,
): Promise<Date | null> {
  for (let i = 0; i < scanDays; i++) {
    const d = addDays(new Date(), i);
    const slots = await getDaySlots(tenantId, barberId, serviceDurationMin, d, stepMin, timeZone);
    if (slots.length) return new Date(slots[0].start);
  }
  return null;
}

/** Server-side guard: re-check a slot is still free before committing. */
export async function isSlotFree(
  tenantId: string,
  barberId: string,
  start: Date,
  end: Date,
  ignoreAppointmentId?: string,
) {
  const clash = await prisma.appointment.findFirst({
    where: {
      tenantId, barberId, active: true, status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
    },
  });
  return !clash;
}
