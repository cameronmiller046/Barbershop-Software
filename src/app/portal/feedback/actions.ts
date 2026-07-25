"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePortalStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { isDemoAccount } from "@/lib/demoMode";
import type { TicketType, TicketSeverity, TicketPriority } from "@/lib/tickets";

const MAX_ATTACH = 6;
const MAX_ATTACH_BYTES = 2_000_000; // ~2MB per image (base64 length proxy)

type Attachment = { name: string; mime: string; dataUrl: string };

export type SubmitTicketInput = {
  type: TicketType;
  title: string;
  description: string;
  severity?: TicketSeverity;
  priority?: TicketPriority;
  labels?: string[];
  details?: Record<string, string>;
  context?: { route?: string; browser?: string; os?: string; screen?: string; appVersion?: string; consoleLogs?: string };
  attachments?: Attachment[];
};

// Generate the next human reference (CHR-1001, CHR-1002, …), retrying on the
// rare race where two submissions land on the same number.
async function createWithRef(data: Omit<Prisma.TicketCreateInput, "ref">) {
  const base = 1000 + (await prisma.ticket.count());
  for (let i = 0; i < 5; i++) {
    try {
      return await prisma.ticket.create({ data: { ...data, ref: `CHR-${base + 1 + i}` } });
    } catch (e: unknown) {
      if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate a ticket reference");
}

export async function submitTicket(input: SubmitTicketInput): Promise<{ ok: true; ref: string; id: string } | { ok: false; error: string }> {
  const user = await requirePortalStaff();
  if (isDemoAccount(user.email)) return { ok: false, error: "Feedback is disabled for demo accounts." };

  const title = (input.title ?? "").trim();
  const description = (input.description ?? "").trim();
  if (!title) return { ok: false, error: "A title is required." };
  if (!description) return { ok: false, error: "A description is required." };
  if (!["BUG", "QUESTION", "FEATURE"].includes(input.type)) return { ok: false, error: "Unknown request type." };

  const atts = (input.attachments ?? [])
    .filter((a) => a?.dataUrl?.startsWith("data:") && a.dataUrl.length <= MAX_ATTACH_BYTES)
    .slice(0, MAX_ATTACH);

  const labels = [...new Set((input.labels ?? []).map((l) => l.trim()).filter(Boolean))].slice(0, 20);

  const ticket = await createWithRef({
    type: input.type,
    title: title.slice(0, 200),
    description: description.slice(0, 8000),
    severity: input.type === "BUG" ? input.severity ?? "MEDIUM" : null,
    priority: input.priority ?? "MEDIUM",
    labels,
    details: input.details ?? {},
    route: input.context?.route?.slice(0, 300) ?? null,
    browser: input.context?.browser?.slice(0, 200) ?? null,
    os: input.context?.os?.slice(0, 200) ?? null,
    screen: input.context?.screen?.slice(0, 60) ?? null,
    appVersion: input.context?.appVersion?.slice(0, 40) ?? null,
    consoleLogs: input.context?.consoleLogs?.slice(0, 12000) ?? null,
    tenant: { connect: { id: user.tenantId } },
    reporter: { connect: { id: user.id } },
    attachments: atts.length ? { create: atts.map((a) => ({ name: a.name.slice(0, 200), mime: a.mime.slice(0, 100), dataUrl: a.dataUrl })) } : undefined,
    activity: { create: { actorId: user.id, kind: "created", detail: `Submitted a ${input.type.toLowerCase()}` } },
  });

  await audit({ action: "ticket.created", tenantId: user.tenantId, userId: user.id, target: ticket.id });
  revalidatePath("/portal/feedback");
  return { ok: true, ref: ticket.ref, id: ticket.id };
}

// A reporter can add a public comment to their own ticket.
export async function addReporterComment(ticketId: string, body: string) {
  const user = await requirePortalStaff();
  if (isDemoAccount(user.email)) return { ok: false, error: "Feedback is disabled for demo accounts." };
  const text = (body ?? "").trim();
  if (!text) return;
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, reporterId: user.id }, select: { id: true } });
  if (!ticket) return;
  await prisma.$transaction([
    prisma.ticketComment.create({ data: { ticketId, authorId: user.id, body: text.slice(0, 5000), internal: false } }),
    prisma.ticketActivity.create({ data: { ticketId, actorId: user.id, kind: "comment", detail: "Reporter replied" } }),
  ]);
  revalidatePath("/portal/feedback");
}
