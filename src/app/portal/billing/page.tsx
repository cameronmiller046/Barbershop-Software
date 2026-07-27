import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortalStaff, isStoreInspector } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { planLimits, parsePlanKey, PLAN_LIMITS, stripePriceId } from "@/lib/plans";
import {
  stripeConfigured, getSubscriptionForManage, setCancelAtPeriodEnd,
  applySetupIntentAsDefault, listInvoices, changeSubscriptionPlan, type InvoiceRow, type ManageDetails,
} from "@/lib/stripe";
import { reconcileTenantBilling } from "@/lib/billing";
import { formatMoney } from "@/lib/utils";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  NONE: { label: "Free plan", tone: "text-cream/70" },
  PENDING: { label: "Payment pending", tone: "text-amber-300" },
  TRIALING: { label: "Free trial", tone: "text-brass" },
  ACTIVE: { label: "Active", tone: "text-emerald-300" },
  PAST_DUE: { label: "Payment past due", tone: "text-red-300" },
  CANCELED: { label: "Canceled", tone: "text-red-300" },
};

const UPGRADE_PLANS = (Object.keys(PLAN_LIMITS) as Plan[]).filter(
  (p) => PLAN_LIMITS[p].paid && PLAN_LIMITS[p].offeredAtSignup,
);

const TENANT_SELECT = {
  id: true, name: true, plan: true, status: true, subscriptionStatus: true,
  currentPeriodEnd: true, trialEndsAt: true, stripeCustomerId: true, stripeSubscriptionId: true,
} as const;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; error?: string; canceled?: string; card?: string; setup_intent?: string; canceled_sub?: string; resumed?: string }>;
}) {
  const sp = await searchParams;
  const staff = await requirePortalStaff();
  if (staff.role !== "OWNER" && !isStoreInspector(staff.role)) redirect("/portal");

  const isDemo = false;

  let tenant = await prisma.tenant.findUnique({ where: { id: staff.tenantId }, select: TENANT_SELECT });
  if (!tenant) redirect("/portal");

  // Returning from a card update → make the new card the default. Stripe calls
  // are wrapped so a transient API hiccup degrades gracefully instead of
  // blanking the whole page (the page still renders from our own DB data).
  if (sp.setup_intent && tenant.stripeCustomerId && stripeConfigured()) {
    try {
      await applySetupIntentAsDefault(sp.setup_intent, tenant.stripeCustomerId, tenant.stripeSubscriptionId);
    } catch { /* non-fatal */ }
  }
  // Refresh status from Stripe in case a webhook was missed.
  try {
    await reconcileTenantBilling(staff.tenantId);
    tenant = (await prisma.tenant.findUnique({ where: { id: staff.tenantId }, select: TENANT_SELECT })) ?? tenant;
  } catch { /* non-fatal — show last-known status from our DB */ }

  const configured = stripeConfigured();
  const limits = planLimits(tenant.plan);
  const status = STATUS_COPY[tenant.subscriptionStatus] ?? STATUS_COPY.NONE;
  const live = tenant.subscriptionStatus === "ACTIVE" || tenant.subscriptionStatus === "TRIALING";
  const needsPayment = limits.paid && !live;

  let manage: ManageDetails | null = null;
  let invoices: InvoiceRow[] = [];
  try {
    if (configured && tenant.stripeSubscriptionId) manage = await getSubscriptionForManage(tenant.stripeSubscriptionId);
    if (configured && tenant.stripeCustomerId) invoices = await listInvoices(tenant.stripeCustomerId);
  } catch { /* non-fatal — hide the manage/history blocks rather than crash the page */ }

  const periodEndDate = manage?.currentPeriodEnd ?? tenant.currentPeriodEnd;
  const canManage = Boolean(tenant.stripeCustomerId) && configured;

  async function startCheckout(formData: FormData) {
    "use server";
    const s = await requirePortalStaff();
    if (s.role !== "OWNER") redirect("/portal/billing?error=checkout");
    const plan = parsePlanKey(String(formData.get("plan") ?? ""));
    if (!plan || !planLimits(plan).paid) redirect("/portal/billing?error=checkout");
    const t = await prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { id: true } });
    if (!t) redirect("/portal/billing?error=checkout");
    await prisma.tenant.update({ where: { id: t.id }, data: { plan, subscriptionStatus: "PENDING" } });
    if (!stripeConfigured()) redirect("/portal/billing?setup=1");
    redirect(`/signup/pay?tenant=${t.id}`);
  }

  async function cancelSubscription() {
    "use server";
    const s = await requirePortalStaff();
    if (s.role !== "OWNER") redirect("/portal/billing?error=checkout");
    const t = await prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { stripeSubscriptionId: true } });
    if (!t?.stripeSubscriptionId) redirect("/portal/billing?error=checkout");
    await setCancelAtPeriodEnd(t.stripeSubscriptionId, true);
    redirect("/portal/billing?canceled_sub=1");
  }

  async function resumeSubscription() {
    "use server";
    const s = await requirePortalStaff();
    if (s.role !== "OWNER") redirect("/portal/billing?error=checkout");
    const t = await prisma.tenant.findUnique({ where: { id: s.tenantId }, select: { stripeSubscriptionId: true } });
    if (!t?.stripeSubscriptionId) redirect("/portal/billing?error=checkout");
    await setCancelAtPeriodEnd(t.stripeSubscriptionId, false);
    redirect("/portal/billing?resumed=1");
  }

  // Switch to a different paid plan. For a LIVE subscriber this changes the price
  // on Stripe (prorated) so billing actually follows the plan; otherwise it sets
  // the target plan and routes into the pay flow.
  async function switchPlan(formData: FormData) {
    "use server";
    const s = await requirePortalStaff();
    if (s.role !== "OWNER") redirect("/portal/billing?error=checkout");
    const plan = parsePlanKey(String(formData.get("plan") ?? ""));
    if (!plan || !planLimits(plan).paid) redirect("/portal/billing?error=checkout");
    const t = await prisma.tenant.findUnique({
      where: { id: s.tenantId },
      select: { id: true, plan: true, stripeSubscriptionId: true, subscriptionStatus: true },
    });
    if (!t) redirect("/portal/billing?error=checkout");
    if (t.plan === plan) redirect("/portal/billing");
    const isLive = t.subscriptionStatus === "ACTIVE" || t.subscriptionStatus === "TRIALING";
    if (isLive && t.stripeSubscriptionId && stripeConfigured()) {
      const ok = await changeSubscriptionPlan(t.stripeSubscriptionId, plan);
      if (!ok) redirect("/portal/billing?error=plan");
      await prisma.tenant.update({ where: { id: t.id }, data: { plan, stripePriceId: stripePriceId(plan) } });
      redirect("/portal/billing?plan_changed=1");
    }
    await prisma.tenant.update({ where: { id: t.id }, data: { plan, subscriptionStatus: "PENDING" } });
    if (!stripeConfigured()) redirect("/portal/billing?setup=1");
    redirect(`/signup/pay?tenant=${t.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-cream">Billing &amp; subscription</h1>
      <p className="mt-1 text-sm text-cream/50">Manage your plan and payment for {tenant.name}.</p>

      {/* Notices */}
      {sp.setup && <Notice tone="amber">Card payments aren&apos;t connected on this server yet. An admin needs to finish the Stripe setup before checkout can run.</Notice>}
      {sp.canceled && <Notice tone="muted">Checkout canceled — no charge was made. Pick up where you left off whenever you&apos;re ready.</Notice>}
      {sp.card && <Notice tone="emerald">Card updated — future charges will use your new card.</Notice>}
      {sp.canceled_sub && <Notice tone="amber">Your subscription is set to cancel at the end of the current period.</Notice>}
      {sp.resumed && <Notice tone="emerald">Your subscription has been resumed.</Notice>}
      {sp.error === "checkout" && <Notice tone="red">Something went wrong. Please try again in a moment.</Notice>}

      {/* Demo shops can't subscribe — point them at signup for their own shop. */}
      {isDemo && (
        <div className="mt-6 rounded-2xl border border-brass/30 bg-brass/[0.06] p-6 text-center">
          <h2 className="font-display text-lg text-cream">You&apos;re exploring the demo</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-cream/60">
            Subscriptions are disabled on the demo shop. Create your own shop to pick a plan and go live.
          </p>
          <Link href="/signup" className="btn-gold mt-4 inline-flex">Sign up for your own shop</Link>
        </div>
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
          {tenant.subscriptionStatus === "TRIALING" && tenant.trialEndsAt && (
            <> · trial ends {tenant.trialEndsAt.toLocaleDateString()}</>
          )}
          {live && manage?.cancelAtPeriodEnd && periodEndDate && (
            <> · <span className="text-amber-300">ends {periodEndDate.toLocaleDateString()}</span></>
          )}
          {live && !manage?.cancelAtPeriodEnd && tenant.subscriptionStatus === "ACTIVE" && periodEndDate && (
            <> · renews {periodEndDate.toLocaleDateString()}</>
          )}
        </div>
      </div>

      {/* Finish payment for a pending paid plan */}
      {needsPayment && (
        <div className="mt-5 rounded-2xl border border-brass/25 bg-brass/[0.05] p-6">
          <h2 className="font-display text-lg text-cream">Finish setting up {limits.label}</h2>
          <p className="mt-1 text-sm text-cream/60">Enter your card to activate your subscription.</p>
          <form action={startCheckout} className="mt-4">
            <input type="hidden" name="plan" value={tenant.plan} />
            <button className="btn-gold" disabled={!configured}>Continue to checkout</button>
          </form>
        </div>
      )}

      {/* Payment method */}
      {canManage && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-cream/45">Payment method</div>
              <div className="mt-1 text-sm text-cream/80">
                {manage?.card
                  ? <span className="capitalize">{manage.card.brand} ···· {manage.card.last4}</span>
                  : <span className="text-cream/45">No card on file</span>}
              </div>
            </div>
            <Link href="/portal/billing/card" className="btn-outline-gold !py-2 text-sm">
              {manage?.card ? "Update card" : "Add card"}
            </Link>
          </div>
        </div>
      )}

      {/* Cancel / resume */}
      {live && tenant.stripeSubscriptionId && configured && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          {manage?.cancelAtPeriodEnd ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-cream/70">
                Scheduled to cancel{periodEndDate ? ` on ${periodEndDate.toLocaleDateString()}` : ""}. You keep access until then.
              </p>
              <form action={resumeSubscription}><button className="btn-gold !py-2 text-sm">Resume subscription</button></form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-cream/60">Cancel anytime — you keep access through the end of the current period.</p>
              <form action={cancelSubscription}>
                <button className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10">
                  Cancel subscription
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Change plan (hidden for demo shops) */}
      {!isDemo && (
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="font-display text-lg text-cream">Change plan</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {UPGRADE_PLANS.map((p) => {
            const pl = planLimits(p);
            const current = p === tenant.plan && live;
            return (
              <form key={p} action={switchPlan} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <input type="hidden" name="plan" value={p} />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cream">{pl.label}</span>
                  <span className="text-sm font-semibold text-brass">{pl.price}/mo</span>
                </div>
                <p className="mt-1 text-xs text-cream/50">Up to {pl.maxBarbers} barbers</p>
                <button disabled={current} className={`mt-3 w-full ${current ? "btn-outline-gold opacity-60" : "btn-gold"}`}>
                  {current ? "Current plan" : "Switch"}
                </button>
              </form>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-cream/45">
          Want Enterprise or multiple locations? <Link href="/contact" className="text-brass hover:underline">Contact us</Link>.
        </p>
      </div>
      )}

      {/* Payment history */}
      {invoices.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-display text-lg text-cream">Payment history</h2>
          <ul className="mt-4 divide-y divide-white/5">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-cream/60">{inv.date.toLocaleDateString()}</span>
                <span className="text-cream/80">{formatMoney(inv.amountCents)}</span>
                <span className={`text-xs ${inv.status === "paid" ? "text-emerald-300" : "text-cream/45"}`}>{inv.status || "—"}</span>
                {inv.url
                  ? <a href={inv.url} target="_blank" rel="noreferrer" className="text-xs text-brass hover:underline">Receipt ↗</a>
                  : <span className="w-14" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "amber" | "emerald" | "red" | "muted"; children: React.ReactNode }) {
  const cls = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
    muted: "border-white/10 bg-white/[0.03] text-cream/70",
  }[tone];
  return <p className={`mt-5 rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}
