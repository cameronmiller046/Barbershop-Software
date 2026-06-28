import type { Role } from "@prisma/client";

// Pure (client-safe) role model: labels, hierarchy, and capability matrix.
// Internal enum values are unchanged; PLATFORM_ADMIN is presented as "Superadmin".

export const ROLE_LABEL: Record<Role, string> = {
  PLATFORM_ADMIN: "Superadmin",
  OWNER: "Admin",
  RECEPTIONIST: "Standard user · Front desk",
  BARBER: "Standard user",
  CUSTOMER: "Customer",
};

export const ROLE_SHORT: Record<Role, string> = {
  PLATFORM_ADMIN: "Superadmin",
  OWNER: "Admin",
  RECEPTIONIST: "Standard user",
  BARBER: "Standard user",
  CUSTOMER: "Customer",
};

// Higher number = more authority. Used to gate who can edit whom.
export const ROLE_RANK: Record<Role, number> = {
  CUSTOMER: 0,
  BARBER: 1,
  RECEPTIONIST: 1,
  OWNER: 2,
  PLATFORM_ADMIN: 3,
};

export function roleLabel(role: Role | undefined | null) {
  return role ? ROLE_LABEL[role] : "—";
}

// Roles a Superadmin can assign from the Users console.
export const SUPERADMIN_ASSIGNABLE: Role[] = ["PLATFORM_ADMIN", "OWNER", "BARBER", "RECEPTIONIST"];

// Roles tied to a specific store (everything except the platform Superadmin).
export const TENANT_ROLES: Role[] = ["OWNER", "BARBER", "RECEPTIONIST"];

export function isPlatformRole(role: Role) {
  return role === "PLATFORM_ADMIN";
}

// Capability matrix shown on the Roles & permissions page (enforced in code).
export type Capability = { area: string; superadmin: boolean; admin: boolean; standard: boolean };

export const CAPABILITIES: Capability[] = [
  { area: "Browse / book on a shop's public site", superadmin: true, admin: true, standard: true },
  { area: "Manage own appointments & clients", superadmin: true, admin: true, standard: true },
  { area: "Manage shop services & social planner", superadmin: true, admin: true, standard: true },
  { area: "See the whole shop's schedule & revenue", superadmin: true, admin: true, standard: false },
  { area: "Manage shop staff (add / level / deactivate)", superadmin: true, admin: true, standard: false },
  { area: "Edit shop branding & settings", superadmin: true, admin: true, standard: false },
  { area: "View & manage ALL stores", superadmin: true, admin: false, standard: false },
  { area: "View & manage ALL user accounts", superadmin: true, admin: false, standard: false },
  { area: "Create stores / onboard customers", superadmin: true, admin: false, standard: false },
  { area: "Approve beta applications", superadmin: true, admin: false, standard: false },
  { area: "Grant Superadmin / Admin levels", superadmin: true, admin: false, standard: false },
];
