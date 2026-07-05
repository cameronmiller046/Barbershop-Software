import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantServices, getTenantBarbers } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { BookingWizard } from "@/components/BookingWizard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "Book" };
  return { title: `Book an Appointment — ${t.name}`, description: `Book your appointment at ${t.name} in under a minute — pick a service, barber, and time.`, alternates: { canonical: appUrl(`/t/${t.slug}/book`) } };
}

export default async function BookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const [services, barbers] = await Promise.all([getTenantServices(t.id), getTenantBarbers(t.id)]);

  return (
    <main className="pb-24">
      <ShopHeader eyebrow="Book Now" title={<>Reserve your <span className="gold-text">chair</span></>} sub="Pick a service, barber, and time — it takes under a minute. No account needed." />
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-10">
        {services.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-cream/50">Online booking is coming soon — give us a call to reserve.</div>
        ) : (
          <BookingWizard
            slug={t.slug}
            brand={t.primaryColor}
            services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, priceCents: s.priceCents, barberId: s.barberId, barberName: s.barber?.name ?? null }))}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
            preselectedServiceId={sp.service ?? null}
          />
        )}
      </section>
    </main>
  );
}
