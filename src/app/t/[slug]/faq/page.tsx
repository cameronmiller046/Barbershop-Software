import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const FAQ = [
  { q: "Do I need an appointment?", a: "Walk-ins are welcome when we have an open chair, but booking ahead guarantees your spot." },
  { q: "How do I reschedule or cancel?", a: "Use the link on your confirmation page — you can reschedule or cancel any time before your appointment." },
  { q: "What payment do you accept?", a: "We accept cash and all major cards in person." },
  { q: "Can I request a specific barber?", a: "Yes — pick your barber during booking, or choose the next available." },
];

export default async function FaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  return (
    <TenantShell tenant={tenant} active="faq">
      <section className="container-page max-w-2xl py-14">
        <h1 className="font-display text-4xl">FAQ</h1>
        <div className="mt-8 space-y-4">
          {FAQ.map((f) => (
            <details key={f.q} className="card">
              <summary className="cursor-pointer font-display text-lg">{f.q}</summary>
              <p className="mt-2 text-sm text-cream/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </TenantShell>
  );
}
