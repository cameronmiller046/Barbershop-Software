import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { Icon, type IconName } from "@/components/home/icons";
import { ShopHeader } from "@/components/shop/ShopHeader";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmtMin = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; const ap = h < 12 ? "AM" : "PM"; const hr = ((h + 11) % 12) + 1; return `${hr}:${String(mm).padStart(2, "0")} ${ap}`; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "Contact" };
  return { title: `Contact & Hours — ${t.name}`, description: `Find ${t.name}: address, phone, hours, and directions.`, alternates: { canonical: appUrl(`/t/${t.slug}/contact`) } };
}

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const base = `/t/${t.slug}`;
  const cta = { background: "var(--brand)", color: "var(--brand-fg)" } as React.CSSProperties;

  const hours = await prisma.workingHour.findMany({ where: { tenantId: t.id }, select: { dayOfWeek: true, startMin: true, endMin: true } });
  const byDay = new Map<number, { open: number; close: number }>();
  for (const w of hours) { const c = byDay.get(w.dayOfWeek); byDay.set(w.dayOfWeek, { open: Math.min(c?.open ?? 1e9, w.startMin), close: Math.max(c?.close ?? -1e9, w.endMin) }); }
  const rows = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: DAYS[d], range: byDay.has(d) ? `${fmtMin(byDay.get(d)!.open)} – ${fmtMin(byDay.get(d)!.close)}` : "Closed" }));
  const mapsDir = t.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.address)}` : null;

  return (
    <main className="pb-24">
      <ShopHeader eyebrow="Visit Us" title={<>Find the <span className="gold-text">shop</span></>} />
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            {t.address && <Info icon="store" title="Address" lines={[t.address]} action={mapsDir ? { label: "Get directions →", href: mapsDir } : undefined} />}
            {t.phone && <Info icon="headset" title="Phone" lines={[t.phone]} action={{ label: "Call now", href: `tel:${t.phone}` }} />}
            {t.email && <Info icon="messages" title="Email" lines={[t.email]} action={{ label: "Email us", href: `mailto:${t.email}` }} />}
            <div className="p-panel p-5">
              <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl border border-brass/25 bg-brass/[0.06] text-brass"><Icon.clock className="h-5 w-5" /></span><span className="text-sm font-semibold text-cream">Business Hours</span></div>
              <div className="mt-3 space-y-1.5">
                {rows.map((h) => <div key={h.day} className="flex justify-between text-sm"><span className="text-cream/60">{h.day}</span><span className={h.range === "Closed" ? "text-cream/35" : "text-cream/85"}>{h.range}</span></div>)}
              </div>
              <p className="mt-3 text-xs text-cream/40">Street &amp; nearby lot parking available.</p>
            </div>
            <Link href={`${base}/book`} className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold shadow-lg" style={cta}>Book an appointment <Icon.arrow className="h-4 w-4" /></Link>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            {t.address ? (
              <iframe title={`Map to ${t.name}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(t.address)}&z=15&output=embed`} loading="lazy" className="h-full min-h-[460px] w-full border-0 grayscale-[0.2]" />
            ) : (
              <div className="grid h-full min-h-[460px] place-items-center bg-white/[0.02] text-cream/40">Location coming soon</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ icon, title, lines, action }: { icon: IconName; title: string; lines: string[]; action?: { label: string; href: string } }) {
  const I = Icon[icon];
  return (
    <div className="p-panel flex items-start gap-4 p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brass/25 bg-brass/[0.06] text-brass"><I className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream">{title}</div>
        {lines.map((l) => <div key={l} className="text-sm text-cream/55">{l}</div>)}
        {action && <a href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-1.5 inline-block text-sm font-medium text-brass hover:underline">{action.label}</a>}
      </div>
    </div>
  );
}
