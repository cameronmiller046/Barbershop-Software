import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toIssue, verifyLink } from "@/lib/yggdrasilLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/yggdrasil/issues?since=<ISO> — tickets in the Link v2 issue shape,
// newest-updated first, optionally filtered to updates after `since`.
export async function GET(req: Request) {
  try {
    if (!(await verifyLink(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const since = new URL(req.url).searchParams.get("since");
    const sinceDate = since && !Number.isNaN(Date.parse(since)) ? new Date(since) : null;

    const tickets = await prisma.ticket.findMany({
      where: sinceDate ? { updatedAt: { gt: sinceDate } } : undefined,
      orderBy: { updatedAt: "desc" },
      take: 1000,
      include: {
        reporter: { select: { name: true, email: true } },
        attachments: { select: { id: true, name: true, mime: true, dataUrl: true } },
      },
    });

    return NextResponse.json({ issues: tickets.map(toIssue) });
  } catch {
    return NextResponse.json({ error: "Could not load issues" }, { status: 500 });
  }
}
