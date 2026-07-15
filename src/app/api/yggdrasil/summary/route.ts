import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DONE_NATIVE_STATUSES,
  LINK_APP,
  LINK_CAPABILITIES,
  LINK_PRODUCT,
  isPaired,
  verifyLink,
} from "@/lib/yggdrasilLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/yggdrasil/summary — app snapshot for the management plane.
// Unauthed callers only learn whether a pairing exists (no secrets).
export async function GET(req: Request) {
  try {
    if (!(await verifyLink(req))) {
      return NextResponse.json({ paired: await isPaired() }, { status: 401 });
    }

    const [openIssues, users] = await Promise.all([
      prisma.ticket.count({ where: { status: { notIn: DONE_NATIVE_STATUSES } } }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      ok: true,
      app: LINK_APP,
      product: LINK_PRODUCT,
      capabilities: LINK_CAPABILITIES,
      counts: { openIssues, users },
      assignableRoles: ["PLATFORM_ADMIN", "OWNER", "BARBER", "RECEPTIONIST", "CUSTOMER"],
    });
  } catch {
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
