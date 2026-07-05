import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear, subWeeks, subMonths, subQuarters, subYears,
} from "date-fns";

export const PRESETS = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["last7", "Last 7 Days"], ["last30", "Last 30 Days"],
  ["thisWeek", "This Week"], ["lastWeek", "Last Week"], ["thisMonth", "This Month"], ["lastMonth", "Last Month"],
  ["thisQuarter", "This Quarter"], ["lastQuarter", "Last Quarter"], ["thisYear", "This Year"], ["lastYear", "Last Year"],
  ["ytd", "Year to Date"], ["mtd", "Month to Date"], ["qtd", "Quarter to Date"], ["rolling12", "Rolling 12 Months"],
  ["custom", "Custom Range"],
] as const;

export type Preset = (typeof PRESETS)[number][0];
export type Gran = "hour" | "day" | "week" | "month";
export type Range = { preset: string; from: Date; to: Date; prevFrom: Date; prevTo: Date; label: string; gran: Gran; days: number };

export function resolveRange(preset: string, now: Date, from?: string, to?: string): Range {
  const make = (f: Date, t: Date, label: string): Range => {
    const len = t.getTime() - f.getTime();
    const prevTo = new Date(f.getTime() - 1);
    const prevFrom = new Date(f.getTime() - len - 1);
    const days = len / 86_400_000;
    const gran: Gran = days <= 2 ? "hour" : days <= 100 ? "day" : days <= 550 ? "week" : "month";
    return { preset, from: f, to: t, prevFrom, prevTo, label, gran, days };
  };
  switch (preset) {
    case "today": return make(startOfDay(now), endOfDay(now), "Today");
    case "yesterday": { const y = subDays(now, 1); return make(startOfDay(y), endOfDay(y), "Yesterday"); }
    case "last7": return make(startOfDay(subDays(now, 6)), endOfDay(now), "Last 7 days");
    case "last30": return make(startOfDay(subDays(now, 29)), endOfDay(now), "Last 30 days");
    case "thisWeek": return make(startOfWeek(now), endOfWeek(now), "This week");
    case "lastWeek": { const w = subWeeks(now, 1); return make(startOfWeek(w), endOfWeek(w), "Last week"); }
    case "thisMonth": return make(startOfMonth(now), endOfMonth(now), "This month");
    case "lastMonth": { const m = subMonths(now, 1); return make(startOfMonth(m), endOfMonth(m), "Last month"); }
    case "thisQuarter": return make(startOfQuarter(now), endOfQuarter(now), "This quarter");
    case "lastQuarter": { const q = subQuarters(now, 1); return make(startOfQuarter(q), endOfQuarter(q), "Last quarter"); }
    case "thisYear": return make(startOfYear(now), endOfYear(now), "This year");
    case "lastYear": { const yr = subYears(now, 1); return make(startOfYear(yr), endOfYear(yr), "Last year"); }
    case "ytd": return make(startOfYear(now), endOfDay(now), "Year to date");
    case "mtd": return make(startOfMonth(now), endOfDay(now), "Month to date");
    case "qtd": return make(startOfQuarter(now), endOfDay(now), "Quarter to date");
    case "rolling12": return make(startOfDay(subMonths(now, 12)), endOfDay(now), "Rolling 12 months");
    case "custom": {
      const f = from ? startOfDay(new Date(from)) : startOfDay(subDays(now, 29));
      const t = to ? endOfDay(new Date(to)) : endOfDay(now);
      return make(isNaN(f.getTime()) ? startOfDay(subDays(now, 29)) : f, isNaN(t.getTime()) ? endOfDay(now) : t, "Custom range");
    }
    default: return make(startOfDay(subDays(now, 29)), endOfDay(now), "Last 30 days");
  }
}
