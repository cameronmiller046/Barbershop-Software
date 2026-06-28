import { prisma } from "@/lib/prisma";
import { addMinutes, startOfDay, endOfDay, isBefore, addDays } from "date-fns";

export type Slot = { start: string; end: string };

/**
 * Bookable slots for a barber + service on a date, scoped to a tenant.
 * Slots step by 15 min, fit fully inside a working window, and avoid clashes.
 */
export async function getDaySlots(
  tenantId: string,
  barberId: string,
  serviceDurationMin: number,
  date: Date,
): Promise<Slot[]> {
  const dayStart = startOfDay(date);
  const dow = dayStart.getDay();

  const wh = await prisma.workingHour.findUnique({
    where: { barberId_dayOfWeek: { barberId, dayOfWeek: dow } },
  });
  if (!wh || wh.tenantId !== tenantId) return [];

  const existing = await prisma.appointment.findMany({
    where: {
      tenantId,
      barberId,
      startTime: { gte: dayStart, lte: endOfDay(date) },
      status: "CONFIRMED",
    },
    select: { startTime: true, endTime: true },
  });

  const slots: Slot[] = [];
  const step = 15;
  const windowStart = addMinutes(dayStart, wh.startMin);
  const windowEnd = addMinutes(dayStart, wh.endMin);
  const now = new Date();

  let cursor = windowStart;
  while (!isBefore(windowEnd, addMinutes(cursor, serviceDurationMin))) {
    const slotEnd = addMinutes(cursor, serviceDurationMin);
    const inPast = isBefore(cursor, now);
    const overlaps = existing.some((a) => cursor < a.endTime && slotEnd > a.startTime);
    if (!inPast && !overlaps) {
      slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
    }
    cursor = addMinutes(cursor, step);
  }
  return slots;
}

/** Next N days that have at least one open slot for the picker. */
export async function getUpcomingDays(
  tenantId: string,
  barberId: string,
  serviceDurationMin: number,
  days = 21,
) {
  const result: { date: string; slots: Slot[] }[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(new Date(), i);
    const slots = await getDaySlots(tenantId, barberId, serviceDurationMin, d);
    if (slots.length) result.push({ date: startOfDay(d).toISOString(), slots });
  }
  return result;
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
      tenantId,
      barberId,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
    },
  });
  return !clash;
}
