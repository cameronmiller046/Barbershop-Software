"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/rbac";
import {
  STATUS_ORDER, PRIORITY_ORDER, SEVERITY_ORDER, STATUS_META, PRIORITY_META, SEVERITY_META,
  type TicketStatus, type TicketPriority, type TicketSeverity, type TicketType,
} from "@/lib/tickets";

const bump = (id?: string) => { revalidatePath("/dev"); if (id) revalidatePath("/portal/feedback"); };

export async function setStatus(id: string, status: string) {
  const admin = await requirePlatformAdmin();
  if (!STATUS_ORDER.includes(status as TicketStatus)) return;
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: { status: status as TicketStatus } }),
    prisma.ticketActivity.create({ data: { ticketId: id, actorId: admin.id, kind: "status", detail: `Moved to ${STATUS_META[status as TicketStatus].label}` } }),
  ]);
  bump(id);
}

export async function assignTicket(id: string, assigneeId: string) {
  const admin = await requirePlatformAdmin();
  const who = assigneeId ? await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true } }) : null;
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: { assigneeId: assigneeId || null } }),
    prisma.ticketActivity.create({ data: { ticketId: id, actorId: admin.id, kind: "assign", detail: who ? `Assigned to ${who.name}` : "Unassigned" } }),
  ]);
  bump(id);
}

export async function setPriority(id: string, priority: string) {
  const admin = await requirePlatformAdmin();
  if (!PRIORITY_ORDER.includes(priority as TicketPriority)) return;
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: { priority: priority as TicketPriority } }),
    prisma.ticketActivity.create({ data: { ticketId: id, actorId: admin.id, kind: "priority", detail: `Priority → ${PRIORITY_META[priority as TicketPriority].label}` } }),
  ]);
  bump(id);
}

export async function setSeverity(id: string, severity: string) {
  const admin = await requirePlatformAdmin();
  const sev = SEVERITY_ORDER.includes(severity as TicketSeverity) ? (severity as TicketSeverity) : null;
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: { severity: sev } }),
    prisma.ticketActivity.create({ data: { ticketId: id, actorId: admin.id, kind: "severity", detail: sev ? `Severity → ${SEVERITY_META[sev].label}` : "Severity cleared" } }),
  ]);
  bump(id);
}

export async function setLabels(id: string, labels: string[]) {
  const admin = await requirePlatformAdmin();
  const clean = [...new Set((labels ?? []).map((l) => l.trim()).filter(Boolean))].slice(0, 20);
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: { labels: clean } }),
    prisma.ticketActivity.create({ data: { ticketId: id, actorId: admin.id, kind: "label", detail: "Labels updated" } }),
  ]);
  bump(id);
}

export async function addAdminComment(id: string, body: string, internal: boolean) {
  const admin = await requirePlatformAdmin();
  const text = (body ?? "").trim();
  if (!text) return;
  await prisma.$transaction([
    prisma.ticketComment.create({ data: { ticketId: id, authorId: admin.id, body: text.slice(0, 8000), internal: !!internal } }),
    prisma.ticketActivity.create({ data: { ticketId: id, actorId: admin.id, kind: "comment", detail: internal ? "Internal note added" : "Response posted" } }),
  ]);
  bump(id);
}

export async function createTicket(input: { type: string; title: string; description: string; priority?: string; severity?: string }) {
  const admin = await requirePlatformAdmin();
  const title = (input.title ?? "").trim();
  const description = (input.description ?? "").trim();
  if (!title || !["BUG", "QUESTION", "FEATURE"].includes(input.type)) return { ok: false as const, error: "Title and type are required." };
  const priority = PRIORITY_ORDER.includes(input.priority as TicketPriority) ? (input.priority as TicketPriority) : "MEDIUM";
  const severity = input.type === "BUG" && SEVERITY_ORDER.includes(input.severity as TicketSeverity) ? (input.severity as TicketSeverity) : input.type === "BUG" ? "MEDIUM" : null;

  const base = 1000 + (await prisma.ticket.count());
  for (let i = 0; i < 5; i++) {
    try {
      const t = await prisma.ticket.create({
        data: {
          ref: `CHR-${base + 1 + i}`, type: input.type as TicketType, title: title.slice(0, 200), description: description.slice(0, 8000),
          priority, severity, status: "NEW", reporter: { connect: { id: admin.id } },
          activity: { create: { actorId: admin.id, kind: "created", detail: "Created in Development Center" } },
        },
      });
      bump();
      return { ok: true as const, id: t.id, ref: t.ref };
    } catch (e: unknown) {
      if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }
  return { ok: false as const, error: "Could not allocate a reference." };
}

// Full thread for the detail drawer (loaded on demand when a card is opened).
export async function getTicketThread(id: string) {
  await requirePlatformAdmin();
  const [comments, activity] = await Promise.all([
    prisma.ticketComment.findMany({ where: { ticketId: id }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } }),
    prisma.ticketActivity.findMany({ where: { ticketId: id }, orderBy: { createdAt: "desc" }, take: 40, include: { actor: { select: { name: true } } } }),
  ]);
  return {
    comments: comments.map((c) => ({ id: c.id, author: c.author.name, body: c.body, internal: c.internal, at: c.createdAt.toISOString() })),
    activity: activity.map((a) => ({ id: a.id, actor: a.actor?.name ?? "System", detail: a.detail ?? a.kind, at: a.createdAt.toISOString() })),
  };
}
