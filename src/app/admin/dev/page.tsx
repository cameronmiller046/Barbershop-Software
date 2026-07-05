import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { OPEN_STATUSES, TYPE_META, type TicketStatus } from "@/lib/tickets";
import { DevBoard, type BoardTicket } from "@/components/dev/DevBoard";

export const dynamic = "force-dynamic";

const OPEN = OPEN_STATUSES as string[];

export default async function DevCenterPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const now = new Date();

  const searchWhere = q
    ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { ref: { contains: q, mode: "insensitive" as const } }] }
    : {};

  const [rows, openCount, criticalBugs, inProgress, qa, readyRelease, releasedToday, closedForAvg, byType] = await Promise.all([
    prisma.ticket.findMany({
      where: searchWhere,
      select: { id: true, ref: true, type: true, title: true, status: true, priority: true, assignee: { select: { name: true } }, tenant: { select: { name: true } }, _count: { select: { comments: true } } },
      orderBy: { createdAt: "desc" }, take: 500,
    }),
    prisma.ticket.count({ where: { status: { in: OPEN as TicketStatus[] } } }),
    prisma.ticket.count({ where: { type: "BUG", severity: "CRITICAL", status: { in: OPEN as TicketStatus[] } } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "QA" } }),
    prisma.ticket.count({ where: { status: "READY_FOR_RELEASE" } }),
    prisma.ticket.count({ where: { status: "RELEASED", updatedAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
    prisma.ticket.findMany({ where: { status: { in: ["RELEASED", "CLOSED"] } }, select: { createdAt: true, updatedAt: true }, take: 500 }),
    prisma.ticket.groupBy({ by: ["type"], _count: true }),
  ]);

  const avgMs = closedForAvg.length ? closedForAvg.reduce((s, t) => s + (t.updatedAt.getTime() - t.createdAt.getTime()), 0) / closedForAvg.length : 0;
  const avgDays = avgMs ? (avgMs / 86_400_000).toFixed(1) : "—";
  const typeCount = (t: string) => byType.find((b) => b.type === t)?._count ?? 0;

  const tickets: BoardTicket[] = rows.map((t) => ({
    id: t.id, ref: t.ref, type: t.type, title: t.title, status: t.status as TicketStatus,
    priority: t.priority, assigneeName: t.assignee?.name ?? null, tenantName: t.tenant?.name ?? null, comments: t._count.comments,
  }));

  const kpis = [
    { label: "Open Issues", value: openCount },
    { label: "Critical Bugs", value: criticalBugs, alert: criticalBugs > 0 },
    { label: "In Progress", value: inProgress },
    { label: "In QA", value: qa },
    { label: "Ready for Release", value: readyRelease },
    { label: "Released Today", value: releasedToday },
    { label: "Avg Resolution", value: `${avgDays}${avgDays !== "—" ? "d" : ""}` },
    { label: "Bugs", value: typeCount("BUG") },
    { label: "Features", value: typeCount("FEATURE") },
    { label: "Questions", value: typeCount("QUESTION") },
  ];

  return (
    <div className="portal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Development Center</h1>
          <p className="mt-1 text-cream/55">Bugs, questions, and feature requests across every shop — triage, assign, and ship.</p>
        </div>
        <form className="flex items-center gap-2">
          <input name="q" defaultValue={q} placeholder="Search tickets…" className="w-56 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:border-brass/60 focus:outline-none" />
          <button className="btn-ghost px-3 py-2 text-sm">Search</button>
        </form>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.alert ? "border-red-500/40 bg-red-500/[0.06]" : "border-white/8 bg-white/[0.02]"}`}>
            <div className="text-xs text-cream/50">{k.label}</div>
            <div className={`mt-1 font-display text-2xl font-semibold ${k.alert ? "text-red-300" : "text-cream"}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-xl">Pipeline</h2>
        <span className="flex gap-3 text-xs text-cream/45">
          {(["BUG", "QUESTION", "FEATURE"] as const).map((t) => <span key={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</span>)}
        </span>
      </div>
      <p className="mt-1 text-xs text-cream/40">Drag cards between columns to update status. Click a card to open it.</p>
      <div className="mt-3">
        {tickets.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center text-cream/45">{q ? "No tickets match your search." : "No tickets yet. They'll appear here as users submit feedback."}</div>
        ) : <DevBoard tickets={tickets} />}
      </div>
    </div>
  );
}
