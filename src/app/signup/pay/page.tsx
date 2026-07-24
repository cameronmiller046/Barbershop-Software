import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ensureSubscriptionIntent } from "@/lib/billing";
import { planLimits } from "@/lib/plans";
import { isDemoAccount } from "@/lib/demoMode";
import { StripePayment } from "@/components/StripePayment";

export const dynamic = "force-dynamic";

// On-page checkout: the owner (already signed in from signup) confirms their
// subscription with the Payment Element here — no redirect to stripe.com.
export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { tenant: tenantId } = await searchParams;
  const user = await requireUser("/signup/pay");
  if (!tenantId) redirect("/portal");

  // The demo shop can't be subscribed to — send demo visitors to sign up for
  // their own shop instead.
  if (isDemoAccount(user.email)) redirect("/signup");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, plan: true, isDemo: true },
  });
  if (!tenant || user.tenantId !== tenant.id) redirect("/portal");
  if (tenant.isDemo) redirect("/signup");

  const res = await ensureSubscriptionIntent(tenant.id);
  if (res.status === "live") redirect("/portal");
  if (res.status === "error") redirect("/portal/billing?error=checkout");

  const limits = planLimits(tenant.plan);

  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />

      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a] shadow-[0_12px_32px_-10px_rgba(216,178,92,0.55)]">
              <ChairMark />
            </span>
            <span className="leading-none">
              <span className="block font-display text-3xl tracking-tight text-cream">The Chair</span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.3em] text-brass/70">Complete your subscription</span>
            </span>
          </Link>

          <StripePayment
            clientSecret={res.clientSecret}
            mode={res.mode}
            publishableKey={res.publishableKey}
            planLabel={limits.label}
            price={limits.price}
            tenantId={tenant.id}
          />

          <Link href="/portal/billing" className="mt-6 block text-center text-sm text-cream/50 transition hover:text-brass">
            ← Back to billing
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChairMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10V6a2 2 0 0 1 2-2h1M18 10V6a2 2 0 0 0-2-2h-1" />
      <rect x="5" y="10" width="14" height="6" rx="1.5" />
      <path d="M7 16v4M17 16v4M4 20h16" />
    </svg>
  );
}
