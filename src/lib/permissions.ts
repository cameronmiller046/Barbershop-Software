import type { Role } from "@prisma/client";

// Shop-level capabilities that can be toggled per user (client-safe, no server deps).
export type PermKey =
  | "shop.viewAll"
  | "shop.clients"
  | "shop.services"
  | "shop.team"
  | "shop.settings";

export const PERMISSIONS: { key: PermKey; label: string; desc: string }[] = [
  { key: "shop.viewAll", label: "Whole-shop schedule & revenue", desc: "See every barber's appointments and shop metrics — not just their own." },
  { key: "shop.clients", label: "Clients", desc: "View and edit the shop's client list and notes." },
  { key: "shop.services", label: "Services", desc: "Add, edit, hide, and remove services." },
  { key: "shop.team", label: "Manage team", desc: "Add staff and change their levels." },
  { key: "shop.settings", label: "Shop settings", desc: "Edit branding, contact info, and shop details." },
];

export const PERM_KEYS = PERMISSIONS.map((p) => p.key);

// Default capability set per role.
const ALL_TRUE: Record<PermKey, boolean> = {
  "shop.viewAll": true, "shop.clients": true, "shop.services": true,
  "shop.team": true, "shop.settings": true,
};
const ALL_FALSE: Record<PermKey, boolean> = {
  "shop.viewAll": false, "shop.clients": false, "shop.services": false,
  "shop.team": false, "shop.settings": false,
};

const DEFAULTS: Record<Role, Record<PermKey, boolean>> = {
  PLATFORM_ADMIN: { ...ALL_TRUE },
  OWNER: { ...ALL_TRUE },
  // Only managers/admins manage the shop (services, settings, team). Barbers
  // run their own chair: their book + their clients.
  RECEPTIONIST: { "shop.viewAll": true, "shop.clients": true, "shop.services": false, "shop.team": false, "shop.settings": false },
  BARBER: { "shop.viewAll": false, "shop.clients": true, "shop.services": false, "shop.team": false, "shop.settings": false },
  CUSTOMER: { ...ALL_FALSE },
};

export function roleDefault(role: Role, key: PermKey): boolean {
  return DEFAULTS[role][key];
}

type PermUser = { role: Role; permissionOverrides?: unknown };

export function overridesOf(u: PermUser): Partial<Record<PermKey, boolean>> {
  const o = u.permissionOverrides;
  if (o && typeof o === "object" && !Array.isArray(o)) return o as Partial<Record<PermKey, boolean>>;
  return {};
}

/** Effective permission: explicit override wins, otherwise the role default. */
export function can(u: PermUser, key: PermKey): boolean {
  const ov = overridesOf(u)[key];
  if (typeof ov === "boolean") return ov;
  return roleDefault(u.role, key);
}

/** Whole permission map for a user (used to drive nav + UI). */
export function permMap(u: PermUser): Record<PermKey, boolean> {
  return PERM_KEYS.reduce((acc, k) => {
    acc[k] = can(u, k);
    return acc;
  }, {} as Record<PermKey, boolean>);
}

export function isPermKey(k: string): k is PermKey {
  return (PERM_KEYS as string[]).includes(k);
}
