// Derives the display status of an appointment from the backend fields
// (status + the clock timestamps). Pure + client-safe.
export type ApptState = "scheduled" | "checkedin" | "inservice" | "completed" | "noshow" | "cancelled";

export function apptState(a: {
  status: string;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
  checkedInAt?: Date | string | null;
  kind?: string | null;
}): ApptState {
  if (a.status === "COMPLETED") return "completed";
  if (a.status === "CANCELLED") return "cancelled";
  if (a.status === "NO_SHOW") return "noshow";
  if (a.startedAt && !a.finishedAt) return "inservice";
  if (a.checkedInAt || a.kind === "WALKIN") return "checkedin";
  return "scheduled";
}

export const STATE_LABEL: Record<ApptState, string> = {
  scheduled: "Scheduled",
  checkedin: "Checked In",
  inservice: "In Service",
  completed: "Completed",
  noshow: "No Show",
  cancelled: "Cancelled",
};
