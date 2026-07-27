import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_SLUG = "professional-barbershop";

// Loc / natural-hair services offered by the flagship shop.
const LOC_SERVICES = [
  { name: "Loc Retwist", description: "Root maintenance to keep your locs neat and tight.", durationMin: 60, priceCents: 6500 },
  { name: "Loc Retwist & Style", description: "Retwist plus a fresh style — barrel rolls, updo, or curls.", durationMin: 90, priceCents: 9500 },
  { name: "Starter Locs", description: "Begin your loc journey — coils or two-strand starters.", durationMin: 120, priceCents: 15000 },
  { name: "Two-Strand Twists", description: "Clean, defined twists for locs or natural hair.", durationMin: 75, priceCents: 7000 },
  { name: "Loc Detox & Wash", description: "Deep cleanse and refresh to keep your locs healthy.", durationMin: 60, priceCents: 5500 },
  { name: "Interlocking / Reattachment", description: "Interlocking maintenance and loc repair.", durationMin: 90, priceCents: 8500 },
];

async function main() {
  // ── Superadmin (internal role PLATFORM_ADMIN, presented as "Superadmin") ──
  const primaryEmail = (process.env.PLATFORM_ADMIN_EMAIL || "cameronmiller046@gmail.com").toLowerCase();
  const primaryPass = process.env.PLATFORM_ADMIN_PASSWORD || "";
  // Fail closed: never ship a default admin password (security hardening).
  if (primaryPass.length < 10) {
    throw new Error("Refusing to seed: set a strong PLATFORM_ADMIN_PASSWORD (10+ chars). No default is shipped.");
  }
  const hash = await bcrypt.hash(primaryPass, 10);

  await prisma.user.deleteMany({ where: { email: "admin@thechair.app", role: "PLATFORM_ADMIN" } });
  await prisma.user.upsert({
    where: { email: primaryEmail },
    update: { role: "PLATFORM_ADMIN", passwordHash: hash, tenantId: null, name: "Cameron Miller" },
    create: { email: primaryEmail, name: "Cameron Miller", role: "PLATFORM_ADMIN", passwordHash: hash },
  });
  console.log(`✓ Superadmin: ${primaryEmail} (password from PLATFORM_ADMIN_PASSWORD)`);

  // ── Hidden dev-team debug account (SUPERUSER) — only when SUPERUSER_PASSWORD is set ──
  const superuserPassword = process.env.SUPERUSER_PASSWORD;
  if (superuserPassword) {
    await prisma.user.upsert({
      where: { email: "superuser" },
      update: { role: "SUPERUSER", name: "Superuser", active: true, tenantId: null, passwordHash: await bcrypt.hash(superuserPassword, 10) },
      create: { email: "superuser", name: "Superuser", role: "SUPERUSER", active: true, passwordHash: await bcrypt.hash(superuserPassword, 10) },
    });
    console.log("✓ Superuser (hidden dev role): superuser / <SUPERUSER_PASSWORD>");
  }

  // ── Flagship store: Professional Barber & Beauty Salon (public, view-only) ──
  const tenantFields = {
    name: "Professional Barber & Beauty Salon",
    status: "ACTIVE" as const,
    plan: "ENTERPRISE" as const,
    tagline: "Barbershop & beauty salon — Stone Mountain, GA.",
    primaryColor: "#C9A24B", // gold
    phone: "404-317-5068",
    address: "4847 Memorial Dr, Stone Mountain, GA 30083",
    slotIntervalMin: 30,
    googleRating: 4.6,
    instagramUrl: "https://instagram.com/professionalbarbershop",
    facebookUrl: "https://facebook.com/professionalbarbershop",
    tiktokUrl: "https://tiktok.com/@professionalbarbershop",
    // Monthly sales goal — drives the Reports goal + pace tracking.
    monthlyGoalCents: 1500000, // $15,000/mo
  };
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_SLUG },
    update: tenantFields,
    create: { slug: DEMO_SLUG, email: "hello@professionalbarbershop.com", storeNumber: Math.floor(Math.random() * 999) + 1, ...tenantFields },
  });

  // ── Clean baseline: keep only the flagship store + the Superadmin ──
  // GUARD: this deletes every non-demo tenant and every non-admin user. It must
  // never run by accident against a live database, so it refuses unless the
  // operator explicitly opts in with CONFIRM_SEED=1.
  if (process.env.CONFIRM_SEED !== "1") {
    throw new Error(
      "Refusing to run the destructive reseed: it deletes ALL non-demo tenants and non-admin users. " +
      "If you really mean to reset this database to the demo baseline, re-run with CONFIRM_SEED=1.",
    );
  }
  await prisma.tenant.deleteMany({ where: { slug: { not: DEMO_SLUG } } });
  await prisma.user.deleteMany({ where: { role: { not: "PLATFORM_ADMIN" } } });
  await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.workingHour.deleteMany({ where: { tenantId: tenant.id } });

  // Flagship services + featured reviews (these persist in the clean state).
  await prisma.service.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.service.createMany({
    data: [
      { tenantId: tenant.id, name: "Haircut", description: "Consultation, cut, and style.", durationMin: 30, priceCents: 3500, sortOrder: 0 },
      { tenantId: tenant.id, name: "Skin Fade", description: "Bald fade with crisp lines.", durationMin: 30, priceCents: 4000, sortOrder: 1 },
      { tenantId: tenant.id, name: "Beard Trim & Shape", description: "Lineup and conditioning.", durationMin: 30, priceCents: 2500, sortOrder: 2 },
      { tenantId: tenant.id, name: "Cut + Beard Combo", description: "The full refresh.", durationMin: 60, priceCents: 5500, sortOrder: 3 },
      { tenantId: tenant.id, name: "Women's Cut & Style", description: "Wash, cut, and blow-dry.", durationMin: 60, priceCents: 6500, sortOrder: 4 },
      { tenantId: tenant.id, name: "Silk Press", description: "Smooth, sleek finish.", durationMin: 90, priceCents: 8000, sortOrder: 5 },
      { tenantId: tenant.id, name: "Kids Cut", description: "Ages 10 and under.", durationMin: 30, priceCents: 2500, sortOrder: 6 },
      { tenantId: tenant.id, name: "Hair Design / Parting", description: "Custom lines and creative design.", durationMin: 30, priceCents: 4500, sortOrder: 7 },
      ...LOC_SERVICES.map((s, i) => ({ tenantId: tenant.id, ...s, sortOrder: 8 + i })),
    ],
  });

  await prisma.review.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.review.createMany({
    data: [
      { tenantId: tenant.id, authorName: "Tyrese Artist", rating: 5, body: "Jazmyn always get my husband hair straight — best hairstylist I've seen do his hair. Greg did my hair the first time, he did a good job, he's gone be my new barber. This place is good, always great conversation an clean environment, keep up the good work. And Mike crazy self be having me dying laughing — he keep the energy going in the shop." },
      { tenantId: tenant.id, authorName: "Shurea Richardson", rating: 5, body: "My hair stylist took great care of me. Talked me through everything she was doing. Had great conversation and I really loved my hair in the end!!!" },
      { tenantId: tenant.id, authorName: "Zulu Adam", rating: 5, body: "I've been cutting my hair there for years and it's the best place in town, you should go and check it for yourself and you won't regret a thing, a thousand stars 🎶 ✨" },
    ],
  });

  const stores = await prisma.tenant.count();
  const users = await prisma.user.count();
  console.log(`✓ Baseline: ${stores} store, ${users} user(s).`);
  console.log(`  Public sandbox demo: /demo/admin and /demo/barber (no login needed).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
