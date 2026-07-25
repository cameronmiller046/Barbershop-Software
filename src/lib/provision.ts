import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import type { Plan, TenantStatus, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify, appUrl } from "@/lib/utils";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";
import { isPaidPlan } from "@/lib/plans";

function tempPassword() {
  // Cryptographically-random temp password (readable word + CSPRNG suffix). Not
  // time-correlated or guessable; the owner should change it on first login.
  const words = ["fade", "razor", "comb", "clipper", "shave", "barber", "chair", "trim"];
  const w = words[randomInt(words.length)];
  return `${w}-${randomBytes(6).toString("base64url")}`; // ~48 bits of entropy
}

/** Ensure a unique tenant slug. */
async function uniqueSlug(base: string) {
  let slug = slugify(base) || "shop";
  let i = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${i++}`;
  }
  return slug;
}

/**
 * Shared low-level creation: makes the Tenant, its OWNER user, starter services,
 * and weekday working hours so the shop can take bookings immediately. Used by
 * both the (admin-approved) beta path and self-serve signup — the two callers
 * differ only in how the password is set and what billing state they start in.
 */
async function createTenantWithOwner(input: {
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  plan: Plan;
  status: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
}) {
  const slug = await uniqueSlug(input.businessName);

  // Random store number (1–999), avoiding existing ones.
  const usedNums = new Set((await prisma.tenant.findMany({ select: { storeNumber: true } })).map((t) => t.storeNumber));
  let storeNumber = Math.floor(Math.random() * 999) + 1;
  while (usedNums.has(storeNumber)) storeNumber = Math.floor(Math.random() * 999) + 1;

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: input.businessName,
      storeNumber,
      status: input.status,
      plan: input.plan,
      subscriptionStatus: input.subscriptionStatus,
      billingEmail: input.email,
      tagline: "Sharp cuts. Good company.",
      email: input.email,
      phone: input.phone ?? null,
      users: {
        create: {
          email: input.email,
          name: input.ownerName,
          role: "OWNER",
          passwordHash: input.passwordHash,
        },
      },
      // Starter services so the new shop isn't empty.
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

  // Give the owner standard Mon–Sat working hours so booking works immediately.
  await prisma.workingHour.createMany({
    data: [1, 2, 3, 4, 5, 6].map((dow) => ({
      tenantId: tenant.id,
      barberId: owner.id,
      dayOfWeek: dow,
      startMin: 9 * 60,
      endMin: 18 * 60,
    })),
  });

  return { tenant, owner, slug };
}

/**
 * Provision a brand-new tenant from an approved application:
 * creates the Tenant, the OWNER user, starter content, and emails credentials.
 * (PRD: Closed Beta Workflow → "System provisions tenant, owner account, ...")
 */
export async function provisionTenant(input: {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string | null;
  applicationId?: string;
}) {
  const email = input.ownerEmail.toLowerCase().trim();

  // Guard against duplicate owner emails.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`A user with email ${email} already exists.`);
  }

  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const { tenant, owner, slug } = await createTenantWithOwner({
    businessName: input.businessName,
    ownerName: input.ownerName,
    email,
    phone: input.phone ?? null,
    passwordHash,
    plan: "SOLO",
    status: "ACTIVE",
    subscriptionStatus: "NONE",
  });

  if (input.applicationId) {
    await prisma.betaApplication.update({
      where: { id: input.applicationId },
      data: { status: "APPROVED", provisionedTenantId: tenant.id, reviewedAt: new Date() },
    });
  }

  const portalUrl = appUrl("/login");
  const siteUrl = appUrl(`/t/${slug}`);
  await sendEmail({
    to: email,
    subject: `Your barbershop is live: ${tenant.name}`,
    html: emailLayout("Welcome to The Chair", `
      <p>Hi ${input.ownerName}, your shop <b>${tenant.name}</b> is ready.</p>
      <p><b>Your website:</b> <a href="${siteUrl}" style="color:#c9a24b">${siteUrl}</a></p>
      <p><b>Portal login:</b> <a href="${portalUrl}" style="color:#c9a24b">${portalUrl}</a></p>
      <p style="background:#0f0f10;border-radius:10px;padding:12px">
        Email: <b>${email}</b><br/>
        Temporary password: <b>${password}</b>
      </p>
      <p>We added 3 starter services and weekday hours so you can take bookings right away.</p>
    `),
  });

  await audit({
    action: "tenant.provisioned",
    tenantId: tenant.id,
    target: tenant.slug,
    meta: { ownerEmail: email, applicationId: input.applicationId },
  });

  return { tenant, owner, tempPassword: password, siteUrl, portalUrl };
}

/**
 * Self-serve signup: a shop owner creates their own account and picks a plan.
 * Free (SOLO) shops go live immediately; paid shops are created in a PENDING /
 * subscriptionStatus=PENDING state and the caller sends the owner to Stripe
 * checkout — the Stripe webhook flips them to ACTIVE once payment succeeds.
 *
 * The owner sets their OWN password here (no temporary password is emailed).
 */
export async function selfServeSignup(input: {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  phone?: string | null;
  plan: Plan;
}) {
  const email = input.ownerEmail.toLowerCase().trim();

  // Guard against duplicate owner emails.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`An account with email ${email} already exists. Try logging in instead.`);
  }

  const paid = isPaidPlan(input.plan);
  const passwordHash = await bcrypt.hash(input.password, 10);

  const { tenant, owner, slug } = await createTenantWithOwner({
    businessName: input.businessName,
    ownerName: input.ownerName,
    email,
    phone: input.phone ?? null,
    passwordHash,
    plan: input.plan,
    // Paid shops stay PENDING until Stripe confirms payment; free shops go live now.
    status: paid ? "PENDING" : "ACTIVE",
    subscriptionStatus: paid ? "PENDING" : "NONE",
  });

  const siteUrl = appUrl(`/t/${slug}`);

  // Free shops are live immediately — welcome them now. Paid shops get their
  // "you're live" email from the webhook once the subscription activates.
  if (!paid) {
    const portalUrl = appUrl("/portal");
    await sendEmail({
      to: email,
      subject: `Your barbershop is live: ${tenant.name}`,
      html: emailLayout("Welcome to The Chair", `
        <p>Hi ${input.ownerName}, your shop <b>${tenant.name}</b> is ready.</p>
        <p><b>Your website:</b> <a href="${siteUrl}" style="color:#c9a24b">${siteUrl}</a></p>
        <p><b>Your portal:</b> <a href="${portalUrl}" style="color:#c9a24b">${portalUrl}</a></p>
        <p>We added 3 starter services and weekday hours so you can take bookings right away.</p>
      `),
    });
  }

  await audit({
    action: "tenant.signup",
    tenantId: tenant.id,
    target: tenant.slug,
    meta: { ownerEmail: email, plan: input.plan, paid },
  });

  return { tenant, owner, slug, siteUrl, paid };
}
