import { startOfWeek, format } from "date-fns";
import type { ApptRow } from "@/lib/reportData";

// ── Metrics a custom report can measure ──────────────────────────────────────
export const BUILDER_METRICS = [
  { key: "revenue", label: "Service Revenue", kind: "money" },
  { key: "tips", label: "Tips", kind: "money" },
  { key: "collected", label: "Total Collected", kind: "money" },
  { key: "completed", label: "Completed Cuts", kind: "count" },
  { key: "appointments", label: "Appointments", kind: "count" },
  { key: "avgTicket", label: "Avg Ticket", kind: "money" },
  { key: "clients", label: "Unique Clients", kind: "count" },
  { key: "noShows", label: "No-Shows", kind: "count" },
  { key: "cancellations", label: "Cancellations", kind: "count" },
] as const;
export type MetricKey = (typeof BUILDER_METRICS)[number]["key"];
export const isMetric = (v: string): v is MetricKey => BUILDER_METRICS.some((m) => m.key === v);
export const metricMeta = (k: MetricKey) => BUILDER_METRICS.find((m) => m.key === k)!;

// ── Dimensions a report can be grouped by ────────────────────────────────────
export const BUILDER_DIMENSIONS = [
  { key: "barber", label: "Barber" },
  { key: "service", label: "Service" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "referral", label: "Referral Source" },
  { key: "channel", label: "Channel" },
  { key: "status", label: "Status" },
  { key: "dayOfWeek", label: "Day of Week" },
  { key: "hourOfDay", label: "Hour of Day" },
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
] as const;
export type DimensionKey = (typeof BUILDER_DIMENSIONS)[number]["key"];
export const isDimension = (v: string): v is DimensionKey => BUILDER_DIMENSIONS.some((d) => d.key === v);
export const dimensionLabel = (k: DimensionKey) => BUILDER_DIMENSIONS.find((d) => d.key === k)!.label;

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;

// Money contributes only on completed appointments.
const rev = (a: ApptRow) => (a.status === "COMPLETED" ? a.collectedCents ?? a.servicePriceCents : 0);
const tip = (a: ApptRow) => (a.status === "COMPLETED" ? a.tipCents ?? 0 : 0);

// The bucket an appointment falls into for a given dimension: a stable key + a display label.
function bucketOf(a: ApptRow, dim: DimensionKey): { key: string; label: string } {
  switch (dim) {
    case "barber": return { key: a.barberId, label: a.barberName };
    case "service": return { key: a.serviceName, label: a.serviceName };
    case "paymentMethod": return { key: a.paymentMethod ?? "—", label: a.paymentMethod ?? "Unrecorded" };
    case "referral": return { key: a.referral ?? "—", label: a.referral ?? "None" };
    case "channel": return a.kind === "WALKIN" ? { key: "walkin", label: "Walk-in" } : { key: "online", label: "Online / Scheduled" };
    case "status": return { key: a.status, label: a.status.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) };
    case "dayOfWeek": return { key: String(a.startTime.getDay()), label: DOW[a.startTime.getDay()] };
    case "hourOfDay": return { key: String(a.startTime.getHours()), label: hourLabel(a.startTime.getHours()) };
    case "day": return { key: format(a.startTime, "yyyy-MM-dd"), label: format(a.startTime, "EEE, MMM d") };
    case "week": { const w = startOfWeek(a.startTime); return { key: format(w, "yyyy-MM-dd"), label: `Week of ${format(w, "MMM d")}` }; }
    case "month": return { key: format(a.startTime, "yyyy-MM"), label: format(a.startTime, "MMM yyyy") };
  }
}

export type BuilderRow = {
  key: string; label: string;
  revenue: number; tips: number; collected: number;
  completed: number; appointments: number; avgTicket: number;
  clients: number; noShows: number; cancellations: number;
};

export function metricValue(r: BuilderRow, m: MetricKey): number {
  return r[m];
}

// Natural chronological sort for time dimensions; otherwise leave to metric sort.
const TIME_DIMS = new Set<DimensionKey>(["dayOfWeek", "hourOfDay", "day", "week", "month"]);

export function buildCustomReport(appts: ApptRow[], dim: DimensionKey, sortBy: MetricKey) {
  const groups = new Map<string, BuilderRow & { _clients: Set<string> }>();
  for (const a of appts) {
    const { key, label } = bucketOf(a, dim);
    let g = groups.get(key);
    if (!g) { g = { key, label, revenue: 0, tips: 0, collected: 0, completed: 0, appointments: 0, avgTicket: 0, clients: 0, noShows: 0, cancellations: 0, _clients: new Set() }; groups.set(key, g); }
    const r = rev(a), t = tip(a);
    g.revenue += r; g.tips += t; g.collected += r + t;
    if (a.status === "COMPLETED") g.completed++;
    if (a.status === "COMPLETED" || a.status === "CONFIRMED") g.appointments++;
    if (a.status === "NO_SHOW") g.noShows++;
    if (a.status === "CANCELLED") g.cancellations++;
    g._clients.add(a.clientId);
  }
  const rows: BuilderRow[] = [...groups.values()].map((g) => {
    const { _clients, ...row } = g;
    row.clients = _clients.size;
    row.avgTicket = row.completed ? Math.round(row.revenue / row.completed) : 0;
    return row;
  });

  if (TIME_DIMS.has(dim)) {
    rows.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  } else {
    rows.sort((a, b) => metricValue(b, sortBy) - metricValue(a, sortBy) || a.label.localeCompare(b.label));
  }

  const totals: BuilderRow = {
    key: "__total", label: "Total",
    revenue: sum(rows, "revenue"), tips: sum(rows, "tips"), collected: sum(rows, "collected"),
    completed: sum(rows, "completed"), appointments: sum(rows, "appointments"),
    clients: 0, noShows: sum(rows, "noShows"), cancellations: sum(rows, "cancellations"),
    avgTicket: 0,
  };
  const allClients = new Set<string>();
  for (const a of appts) allClients.add(a.clientId);
  totals.clients = allClients.size;
  totals.avgTicket = totals.completed ? Math.round(totals.revenue / totals.completed) : 0;

  return { rows, totals };
}

const sum = (rows: BuilderRow[], k: keyof BuilderRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
