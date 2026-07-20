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

    const [openIssues, users, stores] = await Promise.all([
      prisma.ticket.count({ where: { status: { notIn: DONE_NATIVE_STATUSES } } }),
      prisma.user.count(),
      prisma.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({
      ok: true,
      app: LINK_APP,
      product: LINK_PRODUCT,
      capabilities: LINK_CAPABILITIES,
      counts: { openIssues, users },
      // Shop accounts are Mocazari CLIENTS — they only ever get the two store
      // roles (Manager = OWNER, Barber). PLATFORM_ADMIN (Superadmin) is a
      // Mocazari operator level and is deliberately NOT assignable from the fleet
      // panel, so a client can never be granted platform/Yggdrasil-level access.
      assignableRoles: ["OWNER", "BARBER"],
      // Display labels for the management plane (raw role value → friendly name).
      roleLabels: { PLATFORM_ADMIN: "Superadmin", OWNER: "Manager", BARBER: "Barber", RECEPTIONIST: "Barber", CUSTOMER: "Customer" },
      // Shop accounts belong to a store — the create form picks one of these.
      stores,
    });
  } catch {
    return NextResponse.json({ error: "Summary failed" }, { status: 500 });
  }
}
