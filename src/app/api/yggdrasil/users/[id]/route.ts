import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma, Role } from "@prisma/client";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isMasterAdmin } from "@/lib/roles";
import { toBridgeUser, verifyLink } from "@/lib/yggdrasilLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_ROLES: Role[] = ["PLATFORM_ADMIN", "OWNER", "BARBER", "RECEPTIONIST", "CUSTOMER"];

// PATCH /api/yggdrasil/users/[id] — remote account management from Yggdrasil.
// Enforces the same guardrails as the (retired) in-app Superadmin console:
// the master admin can't be demoted/disabled, the last active Superadmin
// can't be removed, and Superadmins never belong to a store.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await verifyLink(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const role = body?.role as Role | undefined;
    const status = body?.status as string | undefined;
    const password = body?.password as string | undefined;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Unknown role" }, { status: 400 });
    }
    if (status !== undefined && status !== "active" && status !== "disabled") {
      return NextResponse.json({ error: "status must be active | disabled" }, { status: 400 });
    }
    if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, active: true, tenantId: true },
    });
    if (!target) return NextResponse.json({ error: "Unknown user" }, { status: 404 });

    // Shop accounts are Mocazari clients: they can be made Admin (OWNER) or
    // Barber, but never elevated to Superadmin (PLATFORM_ADMIN) — that's a
    // Mocazari operator level, managed separately, not granted from the fleet
    // panel. (Existing platform admins keep their level; this only blocks
    // promoting a client into one.)
    if (role === "PLATFORM_ADMIN" && target.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Superadmin can't be granted to a client account from Yggdrasil" }, { status: 400 });
    }

    // The master superadmin can never be demoted or deactivated.
    if (isMasterAdmin(target.email)) {
      if (role !== undefined && role !== target.role) {
        return NextResponse.json({ error: "The master admin's level can't be changed" }, { status: 400 });
      }
      if (status === "disabled") {
        return NextResponse.json({ error: "The master admin can't be disabled" }, { status: 400 });
      }
      if (password !== undefined) {
        return NextResponse.json({ error: "master admin password can't be changed via the bridge" }, { status: 400 });
      }
    }

    // Never remove the LAST active Superadmin (demotion or deactivation).
    const demotes = role !== undefined && target.role === "PLATFORM_ADMIN" && target.active && role !== "PLATFORM_ADMIN";
    const disables = status === "disabled" && target.role === "PLATFORM_ADMIN" && target.active;
    if (demotes || disables) {
      const supers = await prisma.user.count({ where: { role: "PLATFORM_ADMIN", active: true } });
      if (supers <= 1) {
        return NextResponse.json({ error: "Can't remove the last active platform admin" }, { status: 400 });
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (role !== undefined) {
      // Superadmin has no store; store-scoped roles must belong to a tenant —
      // tenant assignment stays an in-app concern.
      if (role === "PLATFORM_ADMIN") {
        data.role = role;
        data.tenant = { disconnect: true };
      } else if (!target.tenantId) {
        return NextResponse.json({ error: "Assign the user to a store in-app before giving a store role" }, { status: 400 });
      } else {
        data.role = role;
      }
    }
    if (status !== undefined) data.active = status === "active";
    if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });

    // Audit trail for remote mutations — metadata only, never the password.
    await audit({
      action: "yggdrasil.user.updated",
      target: updated.id,
      meta: {
        role: updated.role,
        status: updated.active ? "active" : "disabled",
        passwordChanged: password !== undefined,
      },
    });

    return NextResponse.json({ user: toBridgeUser(updated) });
  } catch {
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}
