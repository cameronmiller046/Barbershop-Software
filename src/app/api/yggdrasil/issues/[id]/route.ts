import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MASTER_ADMIN_EMAIL } from "@/lib/roles";
import { STATUS_META } from "@/lib/tickets";
import { NATIVE_TO_NORMALIZED, NORMALIZED_TO_NATIVE, isNormalizedStatus, toIssue, verifyLink } from "@/lib/yggdrasilLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PATCH /api/yggdrasil/issues/[id] — Yggdrasil writes a status and/or a note
// back to a ticket. Notes land as public TicketComments so the reporter sees
// the reply in /portal/feedback.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await verifyLink(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const rawStatus: unknown = body?.status;
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    if (rawStatus !== undefined && !isNormalizedStatus(rawStatus)) {
      return NextResponse.json({ error: "status must be open | in_progress | done" }, { status: 400 });
    }
    const status = isNormalizedStatus(rawStatus) ? rawStatus : undefined;

    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!ticket) return NextResponse.json({ error: "Unknown issue" }, { status: 404 });

    // Only remap when the normalized status actually changes — otherwise an
    // echoed "in_progress" would regress e.g. CODE_REVIEW back to IN_PROGRESS.
    if (status && NATIVE_TO_NORMALIZED[ticket.status] !== status) {
      const native = NORMALIZED_TO_NATIVE[status];
      await prisma.$transaction([
        prisma.ticket.update({ where: { id }, data: { status: native } }),
        prisma.ticketActivity.create({
          data: { ticketId: id, actorId: null, kind: "status", detail: `Status changed to ${STATUS_META[native].label} via Yggdrasil` },
        }),
      ]);
    }

    if (note) {
      // TicketComment.authorId is required — attribute bridge notes to the
      // master admin account; fall back to an activity entry if it's missing.
      const author = await prisma.user.findUnique({ where: { email: MASTER_ADMIN_EMAIL }, select: { id: true } });
      if (author) {
        await prisma.$transaction([
          prisma.ticketComment.create({ data: { ticketId: id, authorId: author.id, body: note.slice(0, 5000), internal: false } }),
          prisma.ticketActivity.create({ data: { ticketId: id, actorId: author.id, kind: "comment", detail: "Replied via Yggdrasil" } }),
        ]);
      } else {
        await prisma.ticketActivity.create({
          data: { ticketId: id, actorId: null, kind: "comment", detail: `Yggdrasil note: ${note.slice(0, 5000)}` },
        });
      }
    }

    const updated = await prisma.ticket.findUnique({
      where: { id },
      include: {
        reporter: { select: { name: true, email: true } },
        attachments: { select: { id: true, name: true, mime: true, dataUrl: true } },
      },
    });
    if (!updated) return NextResponse.json({ error: "Unknown issue" }, { status: 404 });
    return NextResponse.json({ issue: toIssue(updated) });
  } catch {
    return NextResponse.json({ error: "Could not update issue" }, { status: 500 });
  }
}
