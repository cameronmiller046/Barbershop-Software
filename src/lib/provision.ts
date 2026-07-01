import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { slugify, appUrl } from "@/lib/utils";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";

function tempPassword() {
  // readable temporary password; owner changes it on first login (future phase)
  const words = ["fade", "razor", "comb", "clipper", "shave", "barber", "chair", "trim"];
  const w = words[Math.floor((Date.now() / 1000) % words.length)];
  const n = (Date.now() % 9000) + 1000;
  return `${w}-${n}`;
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

  const slug = await uniqueSlug(input.businessName);
  const password = tempPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  // Random store number (1–999), avoiding existing ones.
  const usedNums = new Set((await prisma.tenant.findMany({ select: { storeNumber: true } })).map((t) => t.storeNumber));
  let storeNumber = Math.floor(Math.random() * 999) + 1;
  while (usedNums.has(storeNumber)) storeNumber = Math.floor(Math.random() * 999) + 1;

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: input.businessName,
      storeNumber,
      status: "ACTIVE",
      plan: "SOLO",
      tagline: "Sharp cuts. Good company.",
      email,
      phone: input.phone ?? null,
      users: {
        create: {
          email,
          name: input.ownerName,
          role: "OWNER",
          passwordHash,
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
