import bcrypt from "bcryptjs";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { planLimits, stripePriceId } from "@/lib/plans";
import { audit } from "@/lib/audit";
import {
  stripeConfigured, ensureStripeCustomer, createIncompleteSubscription,
} from "@/lib/stripe";

function tempPassword() {
  const words = ["fade", "razor", "comb", "clipper", "shave", "chair", "trim", "blend"];
  const w = words[Math.floor((Date.now() / 1000) % words.length)];
  return `${w}-${(Date.now() % 9000) + 1000}`;
}

async function uniqueSlug(base: string) {
  let slug = slugify(base) || "shop";
  let i = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) slug = `${slugify(base)}-${i++}`;
  return slug;
}

export type SalesEnrollResult = {
  tenantId: string;
  slug: string;
  ownerEmail: string;
  tempPassword: string;
  payment?: { clientSecret: string; mode: "payment" | "setup" };
};

/**
 * Create a client shop (Tenant + OWNER) on behalf of a sales rep. The rep lives
 * in the separate SWSales-Page database, so attribution is stored as plain refs.
 * When collectNow is set (and the plan is paid + Stripe is configured), also
 * creates an incomplete subscription and returns its client secret so the rep
 * can enter the card via the Payment Element.
 */
export async function salesEnroll(input: {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string | null;
  plan: Plan;
  salesRepId: string;
  salesRepEmail?: string | null;
  collectNow?: boolean;
}): Promise<SalesEnrollResult> {
  const email = input.ownerEmail.toLowerCase().trim();
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error(`A user with email ${email} already exists.`);
  }

  const slug = await uniqueSlug(input.businessName);
  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const used = new Set((await prisma.tenant.findMany({ select: { storeNumber: true } })).map((t) => t.storeNumber));
  let storeNumber = Math.floor(Math.random() * 999) + 1;
  while (used.has(storeNumber)) storeNumber = Math.floor(Math.random() * 999) + 1;

  const tenant = await prisma.tenant.create({
    data: {
      slug, name: input.businessName, storeNumber,
      status: "PENDING", plan: input.plan, subscriptionStatus: "PENDING",
      salesRepId: input.salesRepId, salesRepEmail: input.salesRepEmail ?? null,
      billingEmail: email, email, phone: input.phone ?? null,
      tagline: "Sharp cuts. Good company.",
      users: { create: { email, name: input.ownerName, role: "OWNER", passwordHash } },
      services: {
        create: [
          { name: "Haircut", description: "Classic cut and style.", durationMin: 30, priceCents: 3500, sortOrder: 0 },
          { name: "Beard Trim", description: "Shape-up and line.", durationMin: 20, priceCents: 2000, sortOrder: 1 },
          { name: "Cut + Beard", description: "The full refresh.", durationMin: 45, priceCents: 5000, sortOrder: 2 },
        ],
      },
    },
    include: { users: true },
  });
  const owner = tenant.users[0];
  await prisma.workingHour.createMany({
    data: [1, 2, 3, 4, 5, 6].map((dow) => ({ tenantId: tenant.id, barberId: owner.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 18 * 60 })),
  });

  await audit({ action: "tenant.sales_enroll", tenantId: tenant.id, target: tenant.slug, meta: { salesRepId: input.salesRepId, plan: input.plan } });

  const result: SalesEnrollResult = { tenantId: tenant.id, slug, ownerEmail: email, tempPassword: password };

  // Optional: set up the subscription so the rep can enter the card now.
  if (input.collectNow && planLimits(input.plan).paid && stripeConfigured()) {
    const priceId = stripePriceId(input.plan);
    if (priceId) {
      const customerId = await ensureStripeCustomer({ existingId: null, email, name: input.businessName, tenantId: tenant.id });
      const { subscriptionId, clientSecret, mode } = await createIncompleteSubscription({
        customerId, priceId, trialDays: planLimits(input.plan).trialDays, tenantId: tenant.id, plan: input.plan,
      });
      await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId } });
      result.payment = { clientSecret, mode };
    }
  }

  return result;
}
