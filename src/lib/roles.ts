import type { Role } from "@prisma/client";

// Three levels: Superadmin (platform), Manager (runs a shop), Barber (staff).
// Internal enum keeps legacy values; they map onto the three levels below.

export const ROLE_LABEL: Record<Role, string> = {
  PLATFORM_ADMIN: "Superadmin",
  OWNER: "Manager",
  BARBER: "Barber",
  RECEPTIONIST: "Barber", // legacy → treated as Barber
  CUSTOMER: "Customer",
};

export const ROLE_SHORT: Record<Role, string> = ROLE_LABEL;

// Higher number = more authority. Used to gate who can edit whom.
export const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  RECEPTIONIST: 1,
  BARBER: 1,
  OWNER: 2,
  PLATFORM_ADMIN: 3,
};

export function roleLabel(role: Role | undefined | null) {
  return role ? ROLE_LABEL[role] : "—";
}

// The only assignable levels, in selection order. Superadmin is LAST so it is
// never a default — it must be deliberately chosen.
export const SUPERADMIN_ASSIGNABLE: Role[] = ["BARBER", "OWNER", "PLATFORM_ADMIN"];

// Levels tied to a specific store (everything except the platform Superadmin).
export const TENANT_ROLES: Role[] = ["OWNER", "BARBER"];

export function isPlatformRole(role: Role) {
  return role === "PLATFORM_ADMIN";
}

// Capability matrix shown on the Roles & permissions page (enforced in code).
export type Capability = { area: string; superadmin: boolean; manager: boolean; barber: boolean };

export const CAPABILITIES: Capability[] = [
  { area: "Browse / book on a shop's public site", superadmin: true, manager: true, barber: true },
  { area: "Manage own appointments & clients", superadmin: true, manager: true, barber: true },
  { area: "Manage shop services & social planner", superadmin: true, manager: true, barber: true },
  { area: "See the whole shop's schedule & revenue", superadmin: true, manager: true, barber: false },
  { area: "Manage shop staff (add / level / deactivate)", superadmin: true, manager: true, barber: false },
  { area: "Edit shop branding, settings & booking", superadmin: true, manager: true, barber: false },
  { area: "View & manage ALL stores", superadmin: true, manager: false, barber: false },
  { area: "View & manage ALL user accounts", superadmin: true, manager: false, barber: false },
  { area: "Create stores / onboard customers", superadmin: true, manager: false, barber: false },
  { area: "Approve beta applications", superadmin: true, manager: false, barber: false },
  { area: "Grant Superadmin / Manager levels", superadmin: true, manager: false, barber: false },
];
