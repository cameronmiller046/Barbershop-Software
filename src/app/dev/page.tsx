import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { OPEN_STATUSES, type TicketStatus, type TicketType } from "@/lib/tickets";
import { DevWorkspace, type WsTicket } from "@/components/dev/DevWorkspace";

export const dynamic = "force-dynamic";

const OPEN = OPEN_STATUSES as TicketStatus[];
const DONE: TicketStatus[] = ["RELEASED", "CLOSED", "ARCHIVED"];

export default async function DevBoardPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const typeF = ["BUG", "QUESTION", "FEATURE"].includes(sp.type ?? "") ? (sp.type as TicketType) : null;
  const q = (sp.q ?? "").trim();

  const [rows, assignees] = await Promise.all([
    prisma.ticket.findMany({
      where: {
        ...(typeF ? { type: typeF } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }, { ref: { contains: q, mode: "insensitive" } }] } : {}),
      },
      select: {
        id: true, ref: true, type: true, title: true, description: true, details: true, status: true, priority: true, severity: true, labels: true,
        createdAt: true, updatedAt: true, route: true, browser: true, os: true, screen: true, appVersion: true, consoleLogs: true,
        assignee: { select: { id: true, name: true } }, reporter: { select: { name: true, email: true } }, tenant: { select: { name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 500,
    }),
    prisma.user.findMany({ where: { role: { in: ["PLATFORM_ADMIN", "OWNER"] }, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const tickets: WsTicket[] = rows.map((t) => ({
    id: t.id, ref: t.ref, type: t.type, title: t.title, description: t.description,
    details: (t.details ?? {}) as Record<string, string>,
    status: t.status, priority: t.priority, severity: t.severity, labels: t.labels,
    assigneeId: t.assignee?.id ?? null, assigneeName: t.assignee?.name ?? null,
    reporterName: t.reporter.name, reporterEmail: t.reporter.email, tenantName: t.tenant?.name ?? null,
    comments: t._count.comments, createdISO: t.createdAt.toISOString(), updatedISO: t.updatedAt.toISOString(),
    diagnostics: { route: t.route, browser: t.browser, os: t.os, screen: t.screen, appVersion: t.appVersion, consoleLogs: t.consoleLogs },
  }));

  // Summary
  const summary = {
    issues: rows.length,
    completed: rows.filter((t) => DONE.includes(t.status as TicketStatus)).length,
    inProgress: rows.filter((t) => t.status === "IN_PROGRESS" || t.status === "CODE_REVIEW").length,
    blocked: rows.filter((t) => t.priority === "BLOCKER" && OPEN.includes(t.status as TicketStatus)).length,
  };

  // Team workload (open tickets per assignee)
  const wl = new Map<string, number>();
  for (const t of rows) if (t.assignee && OPEN.includes(t.status as TicketStatus)) wl.set(t.assignee.name, (wl.get(t.assignee.name) ?? 0) + 1);
  const workload = [...wl.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 7);

  // Burndown-style trend: open count at the end of each of the last 14 days
  const now = new Date();
  const trend = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(now, 13 - i);
    const dayEnd = endOfDay(day).getTime();
    const dayStart = startOfDay(day).getTime();
    const open = rows.filter((t) => t.createdAt.getTime() <= dayEnd && (OPEN.includes(t.status as TicketStatus) || t.updatedAt.getTime() > dayEnd)).length;
    return { label: format(day, "M/d"), open, isToday: dayStart === startOfDay(now).getTime() };
  });

  return (
    <DevWorkspace
      tickets={tickets}
      assignees={assignees}
      summary={summary}
      workload={workload}
      trend={trend}
      typeFilter={typeF}
      query={q}
    />
  );
}
