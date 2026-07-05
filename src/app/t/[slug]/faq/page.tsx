import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { Faq, type Qa } from "@/components/pricing/Faq";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "FAQ" };
  return { title: `FAQ — ${t.name}`, description: `Common questions about visiting ${t.name} — walk-ins, cancellations, payment, parking, and more.`, alternates: { canonical: appUrl(`/t/${t.slug}/faq`) } };
}

const FAQ: Qa[][] = [
  [
    { q: "Do you accept walk-ins?", a: "Yes — walk-ins are always welcome. For your preferred barber and time, booking online is the fastest way in." },
    { q: "What's your cancellation policy?", a: "Life happens. Just cancel or reschedule from your confirmation link, ideally at least a couple of hours ahead." },
    { q: "How long does an appointment take?", a: "Most cuts run 30–45 minutes; combos and premium services a bit longer. Each service shows its time when you book." },
    { q: "What payment methods do you accept?", a: "We take card and cash in-shop, and tips are always appreciated." },
    { q: "Is there parking?", a: "Street and nearby lot parking are available. Use \"Get directions\" on the contact page for turn-by-turn navigation." },
  ],
  [
    { q: "Are kids welcome?", a: "Absolutely — we cut for all ages and offer kids' cuts. Bring the whole crew." },
    { q: "Do you sell gift cards?", a: "Yes. Gift cards make a perfect gift — ask at the front desk or mention it when you visit." },
    { q: "Do you offer memberships?", a: "We offer memberships for regulars who want the best value on their monthly cut. Ask your barber for details." },
    { q: "Is the shop accessible?", a: "Our space is designed to be comfortable and accessible for everyone. Let us know if you need anything." },
    { q: "Can I request a specific barber?", a: "Of course. Choose your barber when booking, or pick \"next available\" to be seen sooner." },
  ],
];

export default async function FaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.flat().map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <main className="pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <ShopHeader eyebrow="Good to Know" title={<>Common <span className="gold-text">questions</span></>} />
      <section className="relative z-10 mx-auto max-w-4xl px-5 py-12">
        <Faq columns={FAQ} gridClassName="grid gap-4 md:grid-cols-2" />
      </section>
    </main>
  );
}
