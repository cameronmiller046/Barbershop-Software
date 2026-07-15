import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const where = query
      ? { OR: [{ email: { contains: query, mode: "insensitive" as const } }, { name: { contains: query, mode: "insensitive" as const } }] }
      : undefined;

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
