// Shared options for logging cuts / walk-ins (used by client UI + server actions).
export const REFERRAL_TYPES = [
  "Walk-by / sign",
  "Google",
  "Instagram",
  "Friend / referral",
  "Returning customer",
  "Other",
] as const;

export const HAIRCUT_KINDS = ["APPOINTMENT", "WALKIN"] as const;
export const KIND_LABEL: Record<string, string> = { APPOINTMENT: "Appointment", WALKIN: "Walk-in" };
