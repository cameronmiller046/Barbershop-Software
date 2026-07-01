// Preset reasons for rescheduling / cancelling appointments. Shared by the
// client UI and the server actions (so both validate against the same list).
export const RESCHEDULE_REASONS = [
  "Customer requested change",
  "Barber requested change",
  "Scheduling conflict",
  "Shop closure / holiday",
  "Other",
] as const;

export const CANCEL_REASONS = [
  "Customer requested change",
  "Barber requested change",
  "No show",
  "Double booking",
  "Shop closure / holiday",
  "Other",
] as const;

export const DELETE_REASONS = [
  "Created by mistake",
  "Duplicate booking",
  "Customer requested change",
  "No show",
  "Other",
] as const;

export type Reason = string;

/** A cancel reason of "No show" marks the appointment NO_SHOW; otherwise CANCELLED. */
export function reasonToStatus(reason: string): "NO_SHOW" | "CANCELLED" {
  return /no\s*show/i.test(reason) ? "NO_SHOW" : "CANCELLED";
}
