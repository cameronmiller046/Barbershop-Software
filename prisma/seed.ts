import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { clearDemoData, seedFlagshipDemo, DEMO_SLUG, LOC_SERVICES } from "../src/lib/demo";

const prisma = new PrismaClient();

async function main() {
  // ── Superadmin (internal role PLATFORM_ADMIN, presented as "Superadmin") ──
  const primaryEmail = (process.env.PLATFORM_ADMIN_EMAIL || "cameronmiller046@gmail.com").toLowerCase();
  const primaryPass = process.env.PLATFORM_ADMIN_PASSWORD || "Ieokkyz7";
  const hash = await bcrypt.hash(primaryPass, 10);

  await prisma.user.deleteMany({ where: { email: "admin@thechair.app", role: "PLATFORM_ADMIN" } });
  await prisma.user.upsert({
    where: { email: primaryEmail },
    update: { role: "PLATFORM_ADMIN", passwordHash: hash, tenantId: null, name: "Cameron Miller" },
    create: { email: primaryEmail, name: "Cameron Miller", role: "PLATFORM_ADMIN", passwordHash: hash },
  });
  console.log(`✓ Superadmin: ${primaryEmail} / ${primaryPass}`);

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

  // ── Clean baseline: remove all other stores + all non-superadmin users ──
  await clearDemoData(prisma);

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

  // Populate the flagship with staff + clients + appointments so the demo
  // Admin/Barber portal has real data immediately (no "Try the demo" needed).
  await seedFlagshipDemo(prisma);

  // ── Hidden dev-team debug account (SUPERUSER) ──
  // Created ONLY when SUPERUSER_PASSWORD is set — a cross-tenant god-mode
  // credential must never be committed to the repo. tenantId stays null (it's
  // bound to no store; it picks one at /superuser). Log in with "superuser".
  const superuserPassword = process.env.SUPERUSER_PASSWORD;
  if (superuserPassword) {
    await prisma.user.upsert({
      where: { email: "superuser" },
      update: { role: "SUPERUSER", name: "Superuser", active: true, tenantId: null, passwordHash: await bcrypt.hash(superuserPassword, 10) },
      create: { email: "superuser", name: "Superuser", role: "SUPERUSER", active: true, passwordHash: await bcrypt.hash(superuserPassword, 10) },
    });
    console.log("✓ Superuser (hidden dev role): superuser / <SUPERUSER_PASSWORD>");
  } else {
    console.log("• Superuser skipped — set SUPERUSER_PASSWORD to create the hidden dev account.");
  }

  const stores = await prisma.tenant.count();
  const users = await prisma.user.count();
  const appts = await prisma.appointment.count();
  console.log(`✓ Baseline: ${stores} store, ${users} users, ${appts} appointments.`);
  console.log(`  Portal: test1 / test1 (Manager) · test2 / test2 (Barber).`);
  console.log(`  Use "Try the demo" in /admin to also load the 8 extra stores + traffic.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
