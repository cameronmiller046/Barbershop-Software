import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortalStaff, isStoreInspector } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { planLimits, parsePlanKey, PLAN_LIMITS } from "@/lib/plans";
import { createSubscriptionCheckoutLink, squareConfigured } from "@/lib/square";
import { reconcileTenantBilling } from "@/lib/billing";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  NONE: { label: "Free plan", tone: "text-cream/70" },
  PENDING: { label: "Payment pending", tone: "text-amber-300" },
  TRIALING: { label: "Trial", tone: "text-brass" },
  ACTIVE: { label: "Active", tone: "text-emerald-300" },
  PAST_DUE: { label: "Payment past due", tone: "text-red-300" },
  CANCELED: { label: "Canceled", tone: "text-red-300" },
};

// Plans an owner can self-serve upgrade to from here.
const UPGRADE_PLANS = (Object.keys(PLAN_LIMITS) as Plan[]).filter(
  (p) => PLAN_LIMITS[p].paid && PLAN_LIMITS[p].offeredAtSignup,
);

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const staff = await requirePortalStaff();
  // Billing is an owner concern (store inspectors may view it too).
  if (staff.role !== "OWNER" && !isStoreInspector(staff.role)) redirect("/portal");

  // Refresh from Square in case a webhook was missed.
  await reconcileTenantBilling(staff.tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: staff.tenantId },
    select: {
      id: true, name: true, plan: true, status: true, subscriptionStatus: true,
      currentPeriodEnd: true, trialEndsAt: true,
    },
  });
  if (!tenant) redirect("/portal");

  const limits = planLimits(tenant.plan);
  const status = STATUS_COPY[tenant.subscriptionStatus] ?? STATUS_COPY.NONE;
  const configured = squareConfigured();
  const needsPayment = limits.paid && tenant.subscriptionStatus !== "ACTIVE";

  async function startCheckout(formData: FormData) {
    "use server";
    const s = await requirePortalStaff();
    if (s.role !== "OWNER") redirect("/portal/billing?error=checkout");

    const plan = parsePlanKey(String(formData.get("plan") ?? ""));
    if (!plan || !planLimits(plan).paid) redirect("/portal/billing?error=checkout");

    const t = await prisma.tenant.findUnique({
      where: { id: s.tenantId },
      select: { id: true, name: true, email: true, billingEmail: true, status: true },
    });
    if (!t) redirect("/portal/billing?error=checkout");

    // Record the intended plan and mark billing pending — but DON'T take an
    // already-live shop offline while it re-checks out (leave status untouched).
    await prisma.tenant.update({
      where: { id: t.id },
      data: { plan, subscriptionStatus: "PENDING" },
    });

    if (!configured) redirect("/portal/billing?setup=1");

    let url: string;
    try {
      url = await createSubscriptionCheckoutLink({
        plan,
        tenantId: t.id,
        businessName: t.name,
        email: (t.billingEmail || t.email) ?? "",
      });
    } catch {
      redirect("/portal/billing?error=checkout");
    }
    redirect(url);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-cream">Billing &amp; subscription</h1>
      <p className="mt-1 text-sm text-cream/50">Manage your plan and payment for {tenant.name}.</p>

      {sp.setup && (
        <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Card payments aren&apos;t connected on this server yet. Your shop is created — an admin needs to finish the
          Square setup before checkout can run.
        </p>
      )}
      {sp.error === "checkout" && (
        <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          We couldn&apos;t start checkout. Please try again in a moment.
        </p>
      )}

      {/* Current plan */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-cream/45">Current plan</div>
            <div className="mt-1 font-display text-2xl text-cream">{limits.label}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-cream/45">Status</div>
            <div className={`mt-1 font-semibold ${status.tone}`}>{status.label}</div>
          </div>
        </div>
        <div className="gold-hairline my-5" />
        <div className="text-sm text-cream/60">
          {limits.price === "Free" ? "Free forever" : `${limits.price}/month`}
          {tenant.currentPeriodEnd && tenant.subscriptionStatus === "ACTIVE" && (
            <> · renews {tenant.currentPeriodEnd.toLocaleDateString()}</>
          )}
        </div>
      </div>

      {/* Finish payment for a pending paid plan */}
      {needsPayment && (
        <div className="mt-5 rounded-2xl border border-brass/25 bg-brass/[0.05] p-6">
          <h2 className="font-display text-lg text-cream">Finish setting up {limits.label}</h2>
          <p className="mt-1 text-sm text-cream/60">
            Complete checkout on Square&apos;s secure page to activate your subscription.
          </p>
          <form action={startCheckout} className="mt-4">
            <input type="hidden" name="plan" value={tenant.plan} />
            <button className="btn-gold" disabled={!configured}>Continue to checkout</button>
          </form>
        </div>
      )}

      {/* Upgrade options */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="font-display text-lg text-cream">Change plan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {UPGRADE_PLANS.map((p) => {
            const pl = planLimits(p);
            const current = p === tenant.plan && tenant.subscriptionStatus === "ACTIVE";
            return (
              <form key={p} action={startCheckout} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <input type="hidden" name="plan" value={p} />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cream">{pl.label}</span>
                  <span className="text-sm font-semibold text-brass">{pl.price}/mo</span>
                </div>
                <p className="mt-1 text-xs text-cream/50">Up to {pl.maxBarbers} barbers</p>
                <button
                  disabled={current}
                  className={`mt-3 w-full ${current ? "btn-outline-gold opacity-60" : "btn-gold"}`}
                >
                  {current ? "Current plan" : "Switch"}
                </button>
              </form>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-cream/45">
          Need to cancel or change payment details, or want Enterprise?{" "}
          <Link href="/contact" className="text-brass hover:underline">Contact us</Link>.
        </p>
      </div>
    </div>
  );
}
