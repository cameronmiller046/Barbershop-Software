import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TYPE_META, PRIORITY_META, SEVERITY_META, estimatedResponse, type TicketType, type TicketSeverity, type TicketPriority } from "@/lib/tickets";
import { StatusBadge } from "@/app/portal/feedback/page";
import { ReplyBox } from "@/components/feedback/ReplyBox";

export const dynamic = "force-dynamic";

const DETAIL_LABEL: Record<string, string> = {
  steps: "Steps to reproduce", expected: "Expected behavior", actual: "Actual behavior",
  problem: "Problem being solved", solution: "Suggested solution", benefit: "Expected benefit",
  useCase: "Use case", category: "Category",
};

export default async function ReporterTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffWithPerms();
  const { id } = await params;
  const t = await prisma.ticket.findFirst({
    where: { id, reporterId: user.id },
    include: {
      assignee: { select: { name: true } },
      attachments: { select: { id: true, name: true, dataUrl: true } },
      comments: { where: { internal: false }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      activity: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!t) notFound();
  const details = (t.details ?? {}) as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/portal/feedback" className="text-sm text-cream/50 hover:text-brass">← My Requests</Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: `${TYPE_META[t.type as TicketType].color}22` }}>{TYPE_META[t.type as TicketType].emoji}</span>
        <span className="font-mono text-xs text-cream/40">{t.ref}</span>
        <StatusBadge status={t.status} />
      </div>
      <h1 className="mt-2 font-display text-2xl text-cream sm:text-3xl">{t.title}</h1>
      <p className="mt-1 text-xs text-cream/45">
        Submitted {t.createdAt.toLocaleString()} · Est. response {estimatedResponse(t.type as TicketType, t.severity as TicketSeverity | null, t.priority as TicketPriority)}
        {t.assignee ? ` · Assigned to ${t.assignee.name}` : ""}
      </p>

      <div className="mt-5 grid gap-4">
        <Section title="Description"><p className="whitespace-pre-wrap text-cream/80">{t.description}</p></Section>
        {Object.entries(details).filter(([k]) => DETAIL_LABEL[k]).map(([k, v]) => (
          <Section key={k} title={DETAIL_LABEL[k]}><p className="whitespace-pre-wrap text-cream/80">{v}</p></Section>
        ))}

        <div className="flex flex-wrap gap-2">
          {t.type === "BUG" && t.severity && <Tag label={`Severity: ${SEVERITY_META[t.severity as TicketSeverity].label}`} color={SEVERITY_META[t.severity as TicketSeverity].color} />}
          <Tag label={`Priority: ${PRIORITY_META[t.priority as TicketPriority].label}`} color={PRIORITY_META[t.priority as TicketPriority].color} />
          {t.labels.map((l) => <Tag key={l} label={l} color="#d8b25c" />)}
        </div>

        {t.attachments.length > 0 && (
          <Section title="Screenshots">
            <div className="flex flex-wrap gap-2">
              {t.attachments.map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer"><img src={a.dataUrl} alt={a.name} className="h-24 w-24 rounded-lg border border-white/10 object-cover" /></a>
              ))}
            </div>
          </Section>
        )}

        {/* Conversation */}
        <Section title="Responses">
          {t.comments.length === 0 ? <p className="text-sm text-cream/45">No responses yet. We&apos;ll reply here.</p> : (
            <div className="space-y-3">
              {t.comments.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-cream">{c.author.name}</span><span className="text-cream/40">{c.createdAt.toLocaleString()}</span></div>
                  <p className="whitespace-pre-wrap text-sm text-cream/80">{c.body}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
        <ReplyBox ticketId={t.id} />

        {/* Timeline */}
        <Section title="Activity">
          <ol className="space-y-2.5">
            {t.activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass/70" />
                <div><span className="text-cream/80">{a.detail ?? a.kind}</span> <span className="text-cream/40">— {a.actor?.name ?? "System"}, {a.createdAt.toLocaleString()}</span></div>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="p-panel p-5"><h3 className="mb-2 font-display text-lg text-cream">{title}</h3>{children}</div>;
}
function Tag({ label, color }: { label: string; color: string }) {
  return <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `${color}18`, color }}>{label}</span>;
}
