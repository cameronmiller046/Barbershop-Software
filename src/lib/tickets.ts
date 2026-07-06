// Client-safe metadata for the Feedback & Development Center.
// No server imports here — both modals (client) and pages (server) use it.

export const APP_VERSION = "1.0.0";

export type TicketType = "BUG" | "QUESTION" | "FEATURE";
export type TicketStatus =
  | "NEW" | "NEEDS_REVIEW" | "APPROVED" | "BACKLOG" | "READY"
  | "IN_PROGRESS" | "CODE_REVIEW" | "QA" | "READY_FOR_RELEASE"
  | "RELEASED" | "CLOSED" | "ARCHIVED";
export type TicketPriority = "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "BLOCKER";
export type TicketSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const TYPE_META: Record<TicketType, { label: string; emoji: string; color: string }> = {
  BUG: { label: "Bug Report", emoji: "🐞", color: "#f87171" },
  QUESTION: { label: "Question", emoji: "❓", color: "#60a5fa" },
  FEATURE: { label: "Feature Request", emoji: "💡", color: "#d8b25c" },
};

// Kanban pipeline — order matters (left → right on the board).
export const STATUS_ORDER: TicketStatus[] = [
  "NEW", "NEEDS_REVIEW", "APPROVED", "BACKLOG", "READY",
  "IN_PROGRESS", "CODE_REVIEW", "QA", "READY_FOR_RELEASE",
  "RELEASED", "CLOSED", "ARCHIVED",
];

export const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  NEW: { label: "New", color: "#60a5fa" },
  NEEDS_REVIEW: { label: "Needs Review", color: "#a78bfa" },
  APPROVED: { label: "Approved", color: "#34d399" },
  BACKLOG: { label: "Backlog", color: "#94a3b8" },
  READY: { label: "Ready for Dev", color: "#38bdf8" },
  IN_PROGRESS: { label: "In Progress", color: "#d8b25c" },
  CODE_REVIEW: { label: "Code Review", color: "#fbbf24" },
  QA: { label: "QA Testing", color: "#f472b6" },
  READY_FOR_RELEASE: { label: "Ready for Release", color: "#4ade80" },
  RELEASED: { label: "Released", color: "#22c55e" },
  CLOSED: { label: "Closed", color: "#71717a" },
  ARCHIVED: { label: "Archived", color: "#52525b" },
};

// Statuses a reporter considers "open" (still being worked).
export const OPEN_STATUSES: TicketStatus[] = STATUS_ORDER.filter((s) => s !== "RELEASED" && s !== "CLOSED" && s !== "ARCHIVED");

// The 12 pipeline statuses collapse into 5 board columns (Linear/Jira style).
// Dropping a card into a column sets it to that column's `drop` status.
export type BoardColumn = { key: string; label: string; statuses: TicketStatus[]; drop: TicketStatus; wip?: number };
export const BOARD_COLUMNS: BoardColumn[] = [
  { key: "backlog", label: "Backlog", statuses: ["NEW", "NEEDS_REVIEW", "APPROVED", "BACKLOG"], drop: "BACKLOG" },
  { key: "ready", label: "Ready for Development", statuses: ["READY"], drop: "READY", wip: 5 },
  { key: "in_progress", label: "In Progress", statuses: ["IN_PROGRESS", "CODE_REVIEW"], drop: "IN_PROGRESS", wip: 5 },
  { key: "in_review", label: "In Review", statuses: ["QA", "READY_FOR_RELEASE"], drop: "QA", wip: 3 },
  { key: "done", label: "Done", statuses: ["RELEASED", "CLOSED", "ARCHIVED"], drop: "RELEASED" },
];
export function columnOf(status: TicketStatus): string {
  return BOARD_COLUMNS.find((c) => c.statuses.includes(status))?.key ?? "backlog";
}

export const PRIORITY_ORDER: TicketPriority[] = ["LOWEST", "LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKER"];
export const PRIORITY_META: Record<TicketPriority, { label: string; color: string }> = {
  LOWEST: { label: "Lowest", color: "#94a3b8" },
  LOW: { label: "Low", color: "#60a5fa" },
  MEDIUM: { label: "Medium", color: "#d8b25c" },
  HIGH: { label: "High", color: "#fb923c" },
  CRITICAL: { label: "Critical", color: "#f87171" },
  BLOCKER: { label: "Blocker", color: "#ef4444" },
};

export const SEVERITY_ORDER: TicketSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const SEVERITY_META: Record<TicketSeverity, { label: string; color: string }> = {
  LOW: { label: "Low", color: "#94a3b8" },
  MEDIUM: { label: "Medium", color: "#d8b25c" },
  HIGH: { label: "High", color: "#fb923c" },
  CRITICAL: { label: "Critical", color: "#f87171" },
};

// Suggested labels (users/admins can add any string).
export const SUGGESTED_LABELS = [
  "Frontend", "Backend", "API", "Database", "Authentication", "Calendar",
  "Inventory", "Appointments", "Payments", "Analytics", "UI", "Performance",
  "Security", "Accessibility", "Mobile", "Desktop", "Reporting", "Notifications",
];

export const QUESTION_CATEGORIES = ["Account & Billing", "Booking & Calendar", "Payments", "Staff & Permissions", "Reports", "Website / Storefront", "Other"];

// Rough SLA shown on the confirmation screen, by priority/severity.
export function estimatedResponse(type: TicketType, severity?: TicketSeverity | null, priority?: TicketPriority | null): string {
  if (type === "BUG" && (severity === "CRITICAL")) return "within a few hours";
  if (type === "BUG" && severity === "HIGH") return "within 1 business day";
  if (priority === "BLOCKER" || priority === "CRITICAL") return "within 1 business day";
  if (type === "QUESTION") return "within 1–2 business days";
  return "within 2–3 business days";
}
