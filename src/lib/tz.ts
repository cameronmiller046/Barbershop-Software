/**
 * Business-day boundaries in the SHOP's timezone.
 *
 * date-fns' startOfDay()/startOfWeek() resolve in the SERVER process's
 * timezone — UTC in production — so "today" rolled over at 8pm Eastern instead
 * of the shop's midnight, zeroing out the day's numbers mid-evening. Anything
 * that buckets by business day must go through these helpers.
 */

/** The shop-local calendar date (and weekday) for an instant. */
function zonedYmd(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(get("year")), month0: Number(get("month")) - 1, day: Number(get("day")), weekday: wd[get("weekday")] ?? 0 };
}

/** Convert shop-local midnight on a Y/M/D into the matching UTC instant. */
function zonedMidnightToUtc(year: number, month0: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month0, day, 0, 0);
  // See how that UTC instant reads in the shop timezone, then correct the delta.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const seenAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return new Date(guess - (seenAsUtc - guess));
}

/** Start of the shop-local day containing `at`. */
export function startOfDayInTz(at: Date, timeZone: string): Date {
  const { year, month0, day } = zonedYmd(at, timeZone);
  return zonedMidnightToUtc(year, month0, day, timeZone);
}

/** Start of the shop-local day `days` away from the one containing `at`. */
export function addDaysInTz(at: Date, timeZone: string, days: number): Date {
  const { year, month0, day } = zonedYmd(at, timeZone);
  const civil = new Date(Date.UTC(year, month0, day + days)); // civil-date math handles month/year rollover
  return zonedMidnightToUtc(civil.getUTCFullYear(), civil.getUTCMonth(), civil.getUTCDate(), timeZone);
}

/** End of the shop-local day containing `at` (inclusive, .999ms). */
export function endOfDayInTz(at: Date, timeZone: string): Date {
  return new Date(addDaysInTz(at, timeZone, 1).getTime() - 1);
}

/** Start of the shop-local week (Sunday, matching date-fns' default) containing `at`. */
export function startOfWeekInTz(at: Date, timeZone: string): Date {
  const { weekday } = zonedYmd(at, timeZone);
  return addDaysInTz(at, timeZone, -weekday);
}

/** End of the shop-local week (Saturday, inclusive) containing `at`. */
export function endOfWeekInTz(at: Date, timeZone: string): Date {
  return new Date(addDaysInTz(startOfWeekInTz(at, timeZone), timeZone, 7).getTime() - 1);
}
