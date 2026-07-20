import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { toBridgeUser, verifyLink } from "@/lib/yggdrasilLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/yggdrasil/users?query=&limit=&offset= — account listing for the
// management plane. Selects safe fields only — NEVER passwordHash.
export async function GET(req: Request) {
  try {
    if (!(await verifyLink(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = new URL(req.url).searchParams;
    const query = params.get("query")?.trim() || "";
    const limit = Math.min(Math.max(parseInt(params.get("limit") || "100", 10) || 100, 1), 500);
    const offset = Math.max(parseInt(params.get("offset") || "0", 10) || 0, 0);

    // The hidden SUPERUSER dev-debug accounts are never exposed over the bridge.
    const where = {
      role: { not: "SUPERUSER" as const },
      ...(query
        ? { OR: [{ email: { contains: query, mode: "insensitive" as const } }, { name: { contains: query, mode: "insensitive" as const } }] }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users: users.map(toBridgeUser), total });
  } catch {
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}

// POST /api/yggdrasil/users — create a shop account from the management plane.
// Only the two client store roles (Manager = OWNER, Barber) can be created, and
// every shop account must belong to a store (tenantId) — never a Superadmin.
export async function POST(req: Request) {
  try {
    if (!(await verifyLink(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role as Role | undefined;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";

    if (!email.includes("@")) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    // Never create a platform admin (or any non-store role) via the bridge.
    if (role !== "OWNER" && role !== "BARBER") {
      return NextResponse.json({ error: "Role must be Manager or Barber" }, { status: 400 });
    }
    if (!tenantId) return NextResponse.json({ error: "Pick a store for the account" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) return NextResponse.json({ error: "Unknown store" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

    const created = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        role,
        active: true,
        tenantId,
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });

    await audit({ action: "yggdrasil.user.created", target: created.id, meta: { role: created.role, tenantId } });

    return NextResponse.json({ user: toBridgeUser(created) });
  } catch {
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}
