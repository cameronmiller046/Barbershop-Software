import Link from "next/link";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
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

  return (
    <TenantShell tenant={tenant} active="">
      <div className="container-page max-w-2xl py-12">
        <Link href={`/t/${tenant.slug}`} className="text-sm text-cream/50 hover:text-cream">← {tenant.name}</Link>
        {banner && (
          <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: `${tenant.primaryColor}1a`, border: `1px solid ${tenant.primaryColor}66` }}>
            {banner}
          </div>
        )}

        <div className="card mt-6">
          <span className="chip">{appt.status}</span>
          <h1 className="mt-3 font-display text-3xl">{appt.service.name}</h1>
          <p className="mt-1 text-cream/60">with {appt.barber.name}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-cream/50">When</dt>
              <dd>{new Date(appt.startTime).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</dd></div>
            <div className="flex justify-between"><dt className="text-cream/50">Price</dt><dd>{formatMoney(appt.service.priceCents)}</dd></div>
          </dl>
        </div>

        {editable ? (
          <ManageAppointment slug={tenant.slug} token={token} serviceId={appt.serviceId} brand={tenant.primaryColor} />
        ) : (
          <div className="card mt-6 text-cream/60">
            This appointment is {appt.status.toLowerCase()}.{" "}
            <Link href={`/t/${tenant.slug}/book`} style={{ color: tenant.primaryColor }}>Book a new one</Link>.
          </div>
        )}
      </div>
    </TenantShell>
  );
}
