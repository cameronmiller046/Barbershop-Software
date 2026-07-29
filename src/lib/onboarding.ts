import { prisma } from "@/lib/prisma";

// First-run setup checklist. Every step's "done" is derived from real data, so
// progress reflects what the shop has actually configured — not clicked boxes.

export type OnboardingStep = { key: string; label: string; hint: string; href: string; done: boolean };
export type OnboardingState = {
  steps: OnboardingStep[];
  doneCount: number;
  total: number;
  allDone: boolean;
  dismissed: boolean;
  bookingPath: string;
};

export async function getOnboardingState(tenantId: string): Promise<OnboardingState | null> {
  const [tenant, serviceCount, barberCount, hoursCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, address: true, phone: true, logoUrl: true, heroImageUrl: true, onboardingDismissed: true },
    }),
    prisma.service.count({ where: { tenantId, active: true } }),
    prisma.user.count({ where: { tenantId, role: "BARBER", active: true, kioskOnly: false } }),
    prisma.workingHour.count({ where: { tenantId } }),
  ]);
  if (!tenant) return null;

  const steps: OnboardingStep[] = [
    { key: "details", label: "Add your shop details", hint: "Address and phone so clients can find you.", href: "/portal/settings", done: Boolean(tenant.address && tenant.phone) },
    { key: "services", label: "Add your services", hint: "The cuts and treatments clients can book.", href: "/portal/services", done: serviceCount > 0 },
    { key: "staff", label: "Add your barbers", hint: "The team who take appointments.", href: "/portal/team", done: barberCount > 0 },
    { key: "hours", label: "Set working hours", hint: "When each barber is open to bookings.", href: "/portal/booking", done: hoursCount > 0 },
    { key: "branding", label: "Add your logo or a photo", hint: "Make your booking page feel like yours.", href: "/portal/website", done: Boolean(tenant.logoUrl || tenant.heroImageUrl) },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    doneCount,
    total: steps.length,
    allDone: doneCount === steps.length,
    dismissed: tenant.onboardingDismissed,
    bookingPath: `/t/${tenant.slug}`,
  };
}
