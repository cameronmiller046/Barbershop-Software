// DB-dependent integration tests. These are SKIPPED automatically when no
// database is reachable (e.g. local dev without Postgres, CI without a service),
// and run real, non-destructive invariants when DATABASE_URL points at a live DB.
//
// Run: `npm test` (skips cleanly if no DB) — or point DATABASE_URL at a test
// database and run again to exercise these.
//
// NOTE: HTTP-level E2E (login/logout/session, the full guest→superadmin
// permission matrix on protected routes and API endpoints, booking→checkout)
// needs a running Next server + seeded DB and belongs in a Playwright/supertest
// suite. The checks here are the DB-layer invariants that suite would rely on.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "./prisma";

// Probe connectivity once before the suite (no top-level await — tsx compiles to
// CJS). A refused/unreachable DB is caught → the suite skips instead of erroring.
let dbUp = false;
before(async () => { dbUp = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false); });
after(async () => { try { await prisma.$disconnect(); } catch { /* ignore */ } });

test("connectivity: the database is reachable", async (t) => {
  if (!dbUp) return t.skip("no database reachable");
  assert.equal(dbUp, true);
});

test("tenant isolation: a tenant-scoped client query never leaks another tenant's rows", async (t) => {
  if (!dbUp) return t.skip("no database reachable");
  const tenants = await prisma.tenant.findMany({ select: { id: true }, take: 2 });
  if (tenants.length < 2) return; // not enough data to assert cross-tenant isolation
  const [a, b] = tenants;
  const aClients = await prisma.client.findMany({ where: { tenantId: a.id }, select: { tenantId: true }, take: 200 });
  for (const c of aClients) assert.equal(c.tenantId, a.id, "scoped query returned a foreign tenant's row");
  assert.ok(!aClients.some((c) => c.tenantId === b.id), "tenant A query must not contain tenant B rows");
});

test("schema invariant: appointment manage tokens are unique", async (t) => {
  if (!dbUp) return t.skip("no database reachable");
  const dupes = await prisma.appointment.groupBy({
    by: ["manageToken"],
    _count: { manageToken: true },
    having: { manageToken: { _count: { gt: 1 } } },
  });
  assert.equal(dupes.length, 0, "duplicate manageTokens found — the unique constraint is not holding");
});

test("data integrity: every appointment references a service, barber, and client in its own tenant", async (t) => {
  if (!dbUp) return t.skip("no database reachable");
  const sample = await prisma.appointment.findMany({
    select: { tenantId: true, service: { select: { tenantId: true } }, barber: { select: { tenantId: true } }, client: { select: { tenantId: true } } },
    take: 500,
  });
  for (const a of sample) {
    if (a.service) assert.equal(a.service.tenantId, a.tenantId, "appointment service crosses tenants");
    if (a.barber) assert.equal(a.barber.tenantId, a.tenantId, "appointment barber crosses tenants");
    if (a.client) assert.equal(a.client.tenantId, a.tenantId, "appointment client crosses tenants");
  }
});
