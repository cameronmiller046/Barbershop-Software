// Unit tests for the RBAC permission logic. Pure — no DB required, runs now.
// Covers the role → capability matrix, per-user overrides, and role ranking.

import { test } from "node:test";
import assert from "node:assert/strict";
import { can, roleDefault, permMap, overridesOf, isPermKey, PERM_KEYS } from "./permissions";
import { ROLE_RANK, roleLabel, isMasterAdmin, SUPERADMIN_ASSIGNABLE, MASTER_ADMIN_EMAIL } from "./roles";

test("roleDefault: OWNER has every shop capability", () => {
  for (const k of PERM_KEYS) assert.equal(roleDefault("OWNER", k), true, `OWNER should have ${k}`);
});

test("roleDefault: BARBER cannot manage team/settings or see whole shop", () => {
  assert.equal(roleDefault("BARBER", "shop.team"), false);
  assert.equal(roleDefault("BARBER", "shop.settings"), false);
  assert.equal(roleDefault("BARBER", "shop.viewAll"), false);
  assert.equal(roleDefault("BARBER", "shop.clients"), true); // barbers manage their own clients
});

test("roleDefault: CUSTOMER has no shop capabilities", () => {
  for (const k of PERM_KEYS) assert.equal(roleDefault("CUSTOMER", k), false, `CUSTOMER should NOT have ${k}`);
});

test("can: explicit override beats the role default (both directions)", () => {
  // Deny a capability the role would otherwise grant
  assert.equal(can({ role: "OWNER", permissionOverrides: { "shop.settings": false } }, "shop.settings"), false);
  // Grant a capability the role would otherwise deny (the demo barber pattern)
  assert.equal(can({ role: "BARBER", permissionOverrides: { "shop.settings": true } }, "shop.settings"), true);
  // No override → falls back to role default
  assert.equal(can({ role: "BARBER", permissionOverrides: {} }, "shop.team"), false);
});

test("overridesOf: tolerates malformed override values", () => {
  assert.deepEqual(overridesOf({ role: "BARBER", permissionOverrides: null }), {});
  assert.deepEqual(overridesOf({ role: "BARBER", permissionOverrides: "nope" as unknown }), {});
  assert.deepEqual(overridesOf({ role: "BARBER", permissionOverrides: ["x"] as unknown }), {});
});

test("permMap: returns a boolean for every known permission key", () => {
  const m = permMap({ role: "OWNER" });
  assert.deepEqual(Object.keys(m).sort(), [...PERM_KEYS].sort());
  for (const k of PERM_KEYS) assert.equal(typeof m[k], "boolean");
});

test("isPermKey: only accepts real keys", () => {
  assert.equal(isPermKey("shop.settings"), true);
  assert.equal(isPermKey("shop.launchMissiles"), false);
});

test("ROLE_RANK: superadmin outranks owner outranks barber outranks customer", () => {
  assert.ok(ROLE_RANK.PLATFORM_ADMIN > ROLE_RANK.OWNER);
  assert.ok(ROLE_RANK.OWNER > ROLE_RANK.BARBER);
  assert.ok(ROLE_RANK.BARBER > ROLE_RANK.CUSTOMER);
});

test("roleLabel + master-admin recognition", () => {
  assert.equal(roleLabel("PLATFORM_ADMIN"), "Superadmin");
  assert.equal(roleLabel("OWNER"), "Manager");
  assert.equal(roleLabel(undefined), "—");
  assert.equal(isMasterAdmin(MASTER_ADMIN_EMAIL.toUpperCase()), true);
  assert.equal(isMasterAdmin("someone@else.com"), false);
  assert.equal(isMasterAdmin(null), false);
  // Superadmin is offered last so it's never a default selection
  assert.equal(SUPERADMIN_ASSIGNABLE[SUPERADMIN_ASSIGNABLE.length - 1], "PLATFORM_ADMIN");
});
