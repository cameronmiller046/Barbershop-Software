import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { ManageAppointment } from "@/components/ManageAppointment";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params, searchParams,
}: {
  params: Promise<{ slug: string; token: string }>;
  searchParams: Promise<{ booked?: string; rescheduled?: string }>;
}) {
  const { slug, token } = await params;
  const sp = await searchParams;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const appt = await prisma.appointment.findFirst({
    where: { manageToken: token, tenantId: tenant.id },
    include: { service: true, barber: true, client: true },
  });
  if (!appt) notFound();

  const banner = sp.booked
    ? "You're booked! Bookmark this page to manage your appointment."
    : sp.rescheduled ? "Your appointment time was updated." : null;
  const editable = appt.status === "CONFIRMED";
  const base = `/t/${tenant.slug}`;

  return (
    <main className="relative z-10 mx-auto max-w-2xl px-5 pb-24 pt-36 sm:pt-40">
      <Link href={base} className="text-sm text-cream/50 hover:text-brass">← {tenant.name}</Link>
      {banner && (
        <div className="mt-4 rounded-xl border border-brass/30 bg-brass/[0.08] px-4 py-3 text-sm text-brass/90">{banner}</div>
      )}

      <div className="p-panel mt-6 p-6">
        <span className="badge st-checkedin">{appt.status.replace("_", " ")}</span>
        <h1 className="mt-3 font-display text-3xl text-cream">{appt.service.name}</h1>
        <p className="mt-1 text-cream/60">with {appt.barber.name}</p>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-cream/50">When</dt>
            <dd className="text-cream/90">{new Date(appt.startTime).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</dd></div>
          <div className="flex justify-between"><dt className="text-cream/50">Price</dt><dd className="text-cream/90">{formatMoney(appt.service.priceCents)}</dd></div>
          {appt.tipCents ? (
            <>
              <div className="flex justify-between"><dt className="text-cream/50">Tip</dt><dd className="text-cream/90">{formatMoney(appt.tipCents)}</dd></div>
              <div className="flex justify-between border-t border-white/10 pt-2 font-semibold"><dt className="text-cream/70">Total</dt><dd className="text-brass">{formatMoney(appt.service.priceCents + appt.tipCents)}</dd></div>
            </>
          ) : null}
        </dl>
      </div>

      {editable ? (
        <ManageAppointment slug={tenant.slug} token={token} serviceId={appt.serviceId} brand={tenant.primaryColor} />
      ) : (
        <div className="p-panel mt-6 p-6 text-cream/60">
          This appointment is {appt.status.toLowerCase().replace("_", " ")}.{" "}
          <Link href={`${base}/book`} className="text-brass hover:underline">Book a new one</Link>.
        </div>
      )}
    </main>
  );
}
