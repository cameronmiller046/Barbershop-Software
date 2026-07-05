import Link from "next/link";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TYPE_META, STATUS_META, OPEN_STATUSES, type TicketStatus, type TicketType } from "@/lib/tickets";
import { Reveal } from "@/components/home/motion";

export const dynamic = "force-dynamic";

const OPEN = OPEN_STATUSES as string[];

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ tab?: string; type?: string }> }) {
  const user = await requireStaffWithPerms();
  const sp = await searchParams;
  const tab = sp.tab === "closed" ? "closed" : sp.tab === "all" ? "all" : "open";
  const typeF = ["BUG", "QUESTION", "FEATURE"].includes(sp.type ?? "") ? (sp.type as TicketType) : null;

  const tickets = await prisma.ticket.findMany({
    where: {
      reporterId: user.id,
      ...(typeF ? { type: typeF } : {}),
      ...(tab === "open" ? { status: { in: OPEN as TicketStatus[] } } : tab === "closed" ? { status: { notIn: OPEN as TicketStatus[] } } : {}),
    },
    select: {
      id: true, ref: true, type: true, status: true, title: true, createdAt: true, updatedAt: true,
      assignee: { select: { name: true } }, _count: { select: { comments: true } },
    },
    orderBy: { updatedAt: "desc" }, take: 200,
  });

  const counts = await prisma.ticket.groupBy({ by: ["status"], where: { reporterId: user.id }, _count: true });
  const openCount = counts.filter((c) => OPEN.includes(c.status)).reduce((s, c) => s + c._count, 0);
  const closedCount = counts.filter((c) => !OPEN.includes(c.status)).reduce((s, c) => s + c._count, 0);

  const qp = (o: { tab?: string; type?: string }) => {
    const p = new URLSearchParams();
    if (o.tab && o.tab !== "open") p.set("tab", o.tab);
    if (o.type) p.set("type", o.type);
    return `/portal/feedback${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl text-cream sm:text-3xl">My Requests</h1>
      <p className="mt-1 text-cream/55">Bugs, questions, and feature requests you&apos;ve submitted. Use the feedback button (bottom-right) to add a new one.</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {([["open", `Open (${openCount})`], ["closed", `Closed (${closedCount})`], ["all", "All"]] as const).map(([k, l]) => (
          <Link key={k} href={qp({ tab: k, type: typeF ?? undefined })}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${tab === k ? "border-brass/50 bg-brass/10 text-brass" : "border-white/10 text-cream/60 hover:border-white/25"}`}>{l}</Link>
        ))}
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Link href={qp({ tab, type: undefined })} className={`rounded-full border px-3 py-1.5 text-xs transition ${!typeF ? "border-brass/50 bg-brass/10 text-brass" : "border-white/10 text-cream/60 hover:border-white/25"}`}>All types</Link>
        {(["BUG", "QUESTION", "FEATURE"] as TicketType[]).map((t) => (
          <Link key={t} href={qp({ tab, type: t })} className={`rounded-full border px-3 py-1.5 text-xs transition ${typeF === t ? "border-brass/50 bg-brass/10 text-brass" : "border-white/10 text-cream/60 hover:border-white/25"}`}>{TYPE_META[t].emoji} {TYPE_META[t].label}</Link>
        ))}
      </div>

      <div className="mt-5 space-y-2.5">
        {tickets.length === 0 ? (
          <div className="p-panel p-8 text-center text-cream/50">No requests here yet.</div>
        ) : tickets.map((t, i) => (
          <Reveal key={t.id} delay={Math.min(i * 0.03, 0.3)}>
            <Link href={`/portal/feedback/${t.id}`} className="p-panel flex items-center gap-4 p-4 transition hover:border-brass/40">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${TYPE_META[t.type].color}22` }}>{TYPE_META[t.type].emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-cream/40">{t.ref}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-0.5 truncate font-medium text-cream">{t.title}</div>
                <div className="mt-0.5 text-xs text-cream/45">
                  Updated {t.updatedAt.toLocaleDateString()} · {t._count.comments} {t._count.comments === 1 ? "reply" : "replies"}
                  {t.assignee ? ` · Assigned to ${t.assignee.name}` : ""}
                </div>
              </div>
              <span className="text-cream/30">→</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const m = STATUS_META[status];
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${m.color}22`, color: m.color }}>{m.label}</span>;
}
