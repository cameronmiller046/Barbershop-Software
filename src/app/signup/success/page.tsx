import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { reconcileTenantBilling } from "@/lib/billing";
import { planLimits } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Landing page after Square hosted checkout. The owner is already signed in
// (we signed them in before sending them to Square), so we confirm ownership,
// try to reconcile their subscription immediately, and show the result.
export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { tenant: tenantId } = await searchParams;
  const user = await requireUser("/signup/success");
  if (!tenantId) redirect("/portal");

  // Only the owner of this tenant may view its billing outcome.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, plan: true, subscriptionStatus: true },
  });
  if (!tenant || user.tenantId !== tenant.id) redirect("/portal");

  // Fold in whatever Square already knows (webhook may not have landed yet).
  const status = (await reconcileTenantBilling(tenant.id)) ?? tenant.subscriptionStatus;
  const active = status === "ACTIVE";
  const label = planLimits(tenant.plan).label;

  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />

      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-md animate-fade-up text-center">
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl ${
            active
              ? "bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]"
              : "border border-brass/30 bg-brass/[0.06] text-brass"
          }`}>
            {active ? "✓" : "⏳"}
          </span>

          <h1 className="mt-5 font-display text-3xl text-cream">
            {active ? "You're all set!" : "Almost there…"}
          </h1>

          <p className="mt-3 text-cream/60">
            {active ? (
              <>Your <b className="text-cream">{label}</b> subscription for <b className="text-cream">{tenant.name}</b> is active. Your shop is live.</>
            ) : (
              <>Thanks! We&apos;re confirming your <b className="text-cream">{label}</b> payment for <b className="text-cream">{tenant.name}</b>. This usually takes only a moment — your shop unlocks automatically once it clears.</>
            )}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/portal" className="btn-gold w-full">Go to my portal</Link>
            {!active && (
              <Link href="/portal/billing" className="btn-outline-gold w-full">Check subscription status</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
