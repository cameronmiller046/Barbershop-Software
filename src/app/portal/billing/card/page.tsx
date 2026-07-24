import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortalStaff, isStoreInspector } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createSetupIntentForCustomer, stripePublishableKey, stripeConfigured } from "@/lib/stripe";
import { StripePayment } from "@/components/StripePayment";

export const dynamic = "force-dynamic";

// Update the card on file via the Payment Element (SetupIntent). On success
// Stripe returns to /portal/billing?card=1&setup_intent=… where we set it default.
export default async function UpdateCardPage() {
  const staff = await requirePortalStaff();
  if (staff.role !== "OWNER" && !isStoreInspector(staff.role)) redirect("/portal");

  const t = await prisma.tenant.findUnique({
    where: { id: staff.tenantId },
    select: { stripeCustomerId: true },
  });
  if (!t?.stripeCustomerId || !stripeConfigured()) redirect("/portal/billing?error=checkout");

  const pk = stripePublishableKey();
  const clientSecret = await createSetupIntentForCustomer(t.stripeCustomerId);
  if (!pk || !clientSecret) redirect("/portal/billing?error=checkout");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl text-cream">Update payment method</h1>
      <p className="mt-1 text-sm text-cream/50">Enter a new card — it becomes your default for future charges.</p>

      <div className="mt-6">
        <StripePayment
          clientSecret={clientSecret}
          mode="setup"
          publishableKey={pk}
          tenantId={staff.tenantId}
          title="New card"
          submitLabel="Save card"
          returnPath="/portal/billing?card=1"
        />
      </div>

      <Link href="/portal/billing" className="mt-6 block text-center text-sm text-cream/50 transition hover:text-brass">
        ← Back to billing
      </Link>
    </div>
  );
}
