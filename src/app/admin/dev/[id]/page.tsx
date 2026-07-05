import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TYPE_META, STATUS_META, PRIORITY_META, SEVERITY_META, type TicketType, type TicketStatus, type TicketPriority, type TicketSeverity } from "@/lib/tickets";
import { TicketControls } from "@/components/dev/TicketControls";

export const dynamic = "force-dynamic";

const DETAIL_LABEL: Record<string, string> = {
  steps: "Steps to reproduce", expected: "Expected behavior", actual: "Actual behavior",
  problem: "Problem being solved", solution: "Suggested solution", benefit: "Expected benefit",
  useCase: "Use case", category: "Category",
};

export default async function AdminTicketDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const [t, assignees] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id },
      include: {
        reporter: { select: { name: true, email: true } },
        assignee: { select: { id: true, name: true } },
        tenant: { select: { name: true } },
        attachments: true,
        comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
        activity: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
      },
    }),
    prisma.user.findMany({ where: { role: { in: ["PLATFORM_ADMIN", "OWNER"] }, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!t) notFound();
  const details = (t.details ?? {}) as Record<string, string>;
  const sm = STATUS_META[t.status as TicketStatus];

  return (
    <div className="portal">
      <Link href="/admin/dev" className="text-sm text-cream/50 hover:text-brass">← Development Center</Link>
      <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Main */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: `${TYPE_META[t.type as TicketType].color}22` }}>{TYPE_META[t.type as TicketType].emoji}</span>
            <span className="font-mono text-xs text-cream/40">{t.ref}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: `${sm.color}22`, color: sm.color }}>{sm.label}</span>
          </div>
          <h1 className="font-display text-2xl text-cream sm:text-3xl">{t.title}</h1>

          <Section title="Description"><p className="whitespace-pre-wrap text-cream/80">{t.description}</p></Section>
          {Object.entries(details).filter(([k]) => DETAIL_LABEL[k]).map(([k, v]) => (
            <Section key={k} title={DETAIL_LABEL[k]}><p className="whitespace-pre-wrap text-cream/80">{v}</p></Section>
          ))}

          {t.attachments.length > 0 && (
            <Section title="Screenshots">
              <div className="flex flex-wrap gap-2">
                {t.attachments.map((a) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer"><img src={a.dataUrl} alt={a.name} className="h-28 w-28 rounded-lg border border-white/10 object-cover" /></a>
                ))}
              </div>
            </Section>
          )}

          {(t.route || t.consoleLogs) && (
            <Section title="Diagnostics">
              <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
                <Meta k="Page" v={t.route} /><Meta k="Browser" v={t.browser} />
                <Meta k="OS" v={t.os} /><Meta k="Screen" v={t.screen} />
                <Meta k="Version" v={t.appVersion} />
              </dl>
              {t.consoleLogs && <pre className="p-scroll mt-3 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] leading-relaxed text-cream/70">{t.consoleLogs}</pre>}
            </Section>
          )}

          <Section title="Conversation">
            {t.comments.length === 0 ? <p className="text-sm text-cream/45">No comments yet.</p> : (
              <div className="space-y-3">
                {t.comments.map((c) => (
                  <div key={c.id} className={`rounded-xl border p-3 ${c.internal ? "border-amber-500/25 bg-amber-500/[0.05]" : "border-white/8 bg-white/[0.02]"}`}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-cream">{c.author.name}{c.internal && <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">Internal</span>}</span>
                      <span className="text-cream/40">{c.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-cream/80">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

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

        {/* Sidebar */}
        <div className="space-y-4">
          <TicketControls id={t.id} type={t.type} status={t.status} priority={t.priority} severity={t.severity} assigneeId={t.assignee?.id ?? null} labels={t.labels} assignees={assignees} />
          <div className="p-panel space-y-2 p-5 text-sm">
            <h3 className="mb-1 font-display text-lg text-cream">Details</h3>
            <Meta k="Reporter" v={`${t.reporter.name} · ${t.reporter.email}`} />
            <Meta k="Shop" v={t.tenant?.name ?? "—"} />
            <Meta k="Priority" v={PRIORITY_META[t.priority as TicketPriority].label} />
            {t.type === "BUG" && <Meta k="Severity" v={t.severity ? SEVERITY_META[t.severity as TicketSeverity].label : "—"} />}
            <Meta k="Created" v={t.createdAt.toLocaleString()} />
            <Meta k="Updated" v={t.updatedAt.toLocaleString()} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="p-panel p-5"><h3 className="mb-2 font-display text-lg text-cream">{title}</h3>{children}</div>;
}
function Meta({ k, v }: { k: string; v: string | null }) {
  return <div className="flex justify-between gap-3"><span className="text-cream/45">{k}</span><span className="truncate text-right text-cream/80">{v ?? "—"}</span></div>;
}
