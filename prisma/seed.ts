import { PrismaClient } from "@prisma/client";
import type { User, Client } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, setHours, setMinutes, startOfDay } from "date-fns";
import { seedPlatform } from "./seed-platform";

const prisma = new PrismaClient();

const DEMO_SLUG = "professional-barbershop";

async function main() {
  // ── Platform admins ──
  const primaryEmail = (process.env.PLATFORM_ADMIN_EMAIL || "cameronmiller046@gmail.com").toLowerCase();
  const primaryPass = process.env.PLATFORM_ADMIN_PASSWORD || "Ieokkz7";

  // Remove the legacy default admin if it lingers from earlier seeds.
  await prisma.user.deleteMany({ where: { email: "admin@thechair.app", role: "PLATFORM_ADMIN" } });

  await prisma.user.upsert({
    where: { email: primaryEmail },
    update: { role: "PLATFORM_ADMIN", passwordHash: await bcrypt.hash(primaryPass, 10), tenantId: null },
    create: { email: primaryEmail, name: "Cameron Miller", role: "PLATFORM_ADMIN", passwordHash: await bcrypt.hash(primaryPass, 10) },
  });
  console.log(`✓ Platform admin: ${primaryEmail} / ${primaryPass}`);

  // ── Demo tenant: Professional Barbershop & Salon (public, no login required) ──
  // Note: "Admin123 / Admin123" is seeded below as a BARBER of THIS shop (not a
  // platform admin) so the shop's portal can be demoed from the storefront footer.
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_SLUG },
    update: { status: "ACTIVE", name: "Professional Barbershop & Salon" },
    create: {
      slug: DEMO_SLUG,
      name: "Professional Barbershop & Salon",
      status: "ACTIVE",
      plan: "PRO",
      tagline: "Precision cuts in a classic chair.",
      primaryColor: "#c9a24b",
      email: "hello@professionalbarbershop.com",
      phone: "(555) 018-2244",
      address: "128 Main Street, Downtown",
    },
  });

  // Reset demo CONTENT each run so the showcase stays deterministic and rich.
  // (Order matters: appointments reference services + clients.)
  await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.service.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.review.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.galleryItem.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.socialPost.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.workingHour.deleteMany({ where: { tenantId: tenant.id } });

  // Owner (kept as a staff record; not advertised — demo is view-only).
  const owner = await prisma.user.upsert({
    where: { email: "owner@professionalbarbershop.com" },
    update: { tenantId: tenant.id, role: "OWNER" },
    create: {
      tenantId: tenant.id, email: "owner@professionalbarbershop.com", name: "Marcus Reed",
      role: "OWNER", passwordHash: await bcrypt.hash("demo1234", 10),
      bio: "Owner & master barber. 15 years behind the chair.",
    },
  });

  // Barbers (these appear on the public Team page).
  // "Admin123" is a real barber on this shop — its login (admin123 / Admin123) is
  // how the shop's portal is demoed from the "Powered by The Chair" footer link.
  const barbersData = [
    { email: "deion@professionalbarbershop.com", name: "Deion Carter", bio: "Fades and beard sculpting specialist.", instagramHandle: "deioncuts", avatarUrl: "https://i.pravatar.cc/240?img=12", password: "demo1234" },
    { email: "luis@professionalbarbershop.com", name: "Luis Romero", bio: "Classic scissor work and hot-towel shaves.", instagramHandle: "luistrim", avatarUrl: "https://i.pravatar.cc/240?img=33", password: "demo1234" },
    { email: "andre@professionalbarbershop.com", name: "Andre Wallace", bio: "Tapers, kids' cuts, and a steady hand.", instagramHandle: "andrethebarber", avatarUrl: "https://i.pravatar.cc/240?img=15", password: "demo1234" },
    { email: "sofia@professionalbarbershop.com", name: "Sofia Nguyen", bio: "Modern styles, color, and hair design.", instagramHandle: "sofiacuts", avatarUrl: "https://i.pravatar.cc/240?img=47", password: "demo1234" },
    { email: "admin123", name: "Admin123", bio: "Senior barber & shop manager.", instagramHandle: "professionalbarbershop", avatarUrl: "https://i.pravatar.cc/240?img=53", password: "Admin123" },
  ];
  const barbers: User[] = [];
  for (const b of barbersData) {
    const passwordHash = await bcrypt.hash(b.password, 10);
    barbers.push(
      await prisma.user.upsert({
        where: { email: b.email },
        // Convert any prior account (e.g. a former platform admin) into this shop's barber.
        update: { tenantId: tenant.id, role: "BARBER", name: b.name, bio: b.bio, instagramHandle: b.instagramHandle, avatarUrl: b.avatarUrl, active: true, passwordHash },
        create: { tenantId: tenant.id, email: b.email, name: b.name, role: "BARBER", passwordHash, bio: b.bio, instagramHandle: b.instagramHandle, avatarUrl: b.avatarUrl },
      }),
    );
  }

  // Working hours: Mon–Sat 9:00–19:00 for the owner + every barber.
  for (const staff of [owner, ...barbers]) {
    for (const dow of [1, 2, 3, 4, 5, 6]) {
      await prisma.workingHour.create({
        data: { tenantId: tenant.id, barberId: staff.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 19 * 60 },
      });
    }
  }

  // Services (8) — a couple pinned to specific barbers to show that feature.
  await prisma.service.createMany({
    data: [
      { tenantId: tenant.id, name: "Signature Haircut", description: "Consultation, cut, and style.", durationMin: 30, priceCents: 4000, sortOrder: 0, imageUrl: "https://picsum.photos/seed/cut1/600/400" },
      { tenantId: tenant.id, name: "Skin Fade", description: "Bald fade with crisp lines.", durationMin: 40, priceCents: 4500, sortOrder: 1, barberId: barbers[0].id, imageUrl: "https://picsum.photos/seed/fade2/600/400" },
      { tenantId: tenant.id, name: "Beard Trim & Shape", description: "Lineup and conditioning.", durationMin: 20, priceCents: 2500, sortOrder: 2, imageUrl: "https://picsum.photos/seed/beard3/600/400" },
      { tenantId: tenant.id, name: "Cut + Beard Combo", description: "The complete refresh.", durationMin: 50, priceCents: 6000, sortOrder: 3, imageUrl: "https://picsum.photos/seed/combo4/600/400" },
      { tenantId: tenant.id, name: "Hot Towel Shave", description: "Traditional straight-razor shave.", durationMin: 30, priceCents: 3500, sortOrder: 4, barberId: barbers[1].id, imageUrl: "https://picsum.photos/seed/shave5/600/400" },
      { tenantId: tenant.id, name: "Kids Cut", description: "Ages 10 and under.", durationMin: 20, priceCents: 2500, sortOrder: 5, imageUrl: "https://picsum.photos/seed/kids6/600/400" },
      { tenantId: tenant.id, name: "Senior Cut", description: "Classic cut, 65+.", durationMin: 30, priceCents: 3000, sortOrder: 6, imageUrl: "https://picsum.photos/seed/senior7/600/400" },
      { tenantId: tenant.id, name: "Hair Design / Parting", description: "Custom lines and creative design.", durationMin: 35, priceCents: 5000, sortOrder: 7, barberId: barbers[3].id, imageUrl: "https://picsum.photos/seed/design8/600/400" },
    ],
  });

  // Reviews (6)
  await prisma.review.createMany({
    data: [
      { tenantId: tenant.id, authorName: "James T.", rating: 5, body: "Best fade in the city. Deion never misses." },
      { tenantId: tenant.id, authorName: "Priya R.", rating: 5, body: "Booked online in 30 seconds, in and out, perfect cut." },
      { tenantId: tenant.id, authorName: "Marcus B.", rating: 5, body: "Luis gives the best hot towel shave I've had. So relaxing." },
      { tenantId: tenant.id, authorName: "Online customer", rating: 4, body: "Great atmosphere and friendly barbers." },
      { tenantId: tenant.id, authorName: "Devon W.", rating: 5, body: "Sofia did a custom design for my son — he loved it." },
      { tenantId: tenant.id, authorName: "Chris L.", rating: 5, body: "Clean shop, easy booking, fair prices. My new spot." },
    ],
  });

  // Gallery (8)
  await prisma.galleryItem.createMany({
    data: ["Fresh fade", "Beard sculpt", "Classic taper", "Lineup", "Pompadour", "Buzz + design", "Hot towel shave", "Kids cut"].map((caption, i) => ({
      tenantId: tenant.id,
      imageUrl: `https://picsum.photos/seed/barbergallery${i}/600/${480 + (i % 4) * 60}`,
      caption,
      sortOrder: i,
    })),
  });

  // Clients + a spread of appointments (past = metrics, upcoming = schedule).
  const services = await prisma.service.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: "asc" } });
  const clientNames = [
    ["Jordan Smith", "jordan@example.com", "(555) 200-1001"],
    ["Avery Brooks", "avery@example.com", "(555) 200-1002"],
    ["Sam Rivera", "sam@example.com", "(555) 200-1003"],
    ["Taylor Quinn", "taylor@example.com", "(555) 200-1004"],
    ["Casey Morgan", "casey@example.com", "(555) 200-1005"],
  ];
  const clients: Client[] = [];
  for (const [name, email, phone] of clientNames) {
    clients.push(await prisma.client.create({ data: { tenantId: tenant.id, name, email, phone } }));
  }

  function apptAt(dayOffset: number, hour: number, barberIdx: number, serviceIdx: number, clientIdx: number, status: "CONFIRMED" | "COMPLETED") {
    const svc = services[serviceIdx];
    const start = setMinutes(setHours(startOfDay(dayOffset < 0 ? subDays(new Date(), -dayOffset) : addDays(new Date(), dayOffset)), hour), 0);
    return prisma.appointment.create({
      data: {
        tenantId: tenant.id, serviceId: svc.id, barberId: barbers[barberIdx].id, clientId: clients[clientIdx].id,
        startTime: start, endTime: new Date(start.getTime() + svc.durationMin * 60000), status,
        notes: status === "COMPLETED" ? "Regular — usual cut." : null,
      },
    });
  }
  // Past (completed) for revenue/metrics
  await apptAt(-7, 11, 0, 1, 0, "COMPLETED");
  await apptAt(-5, 14, 1, 4, 1, "COMPLETED");
  await apptAt(-2, 10, 3, 7, 2, "COMPLETED");
  // Upcoming (confirmed)
  await apptAt(1, 10, 0, 0, 3, "CONFIRMED");
  await apptAt(1, 13, 1, 3, 4, "CONFIRMED");
  await apptAt(2, 15, 3, 5, 0, "CONFIRMED");

  // Admin123's own book — so logging into the shop portal as this barber shows a
  // full day, upcoming appointments, and history (the barber dashboard is per-barber).
  await apptAt(0, 10, 4, 0, 1, "CONFIRMED"); // today
  await apptAt(0, 12, 4, 3, 2, "CONFIRMED"); // today
  await apptAt(0, 15, 4, 2, 0, "CONFIRMED"); // today
  await apptAt(1, 11, 4, 1, 3, "CONFIRMED"); // tomorrow
  await apptAt(3, 14, 4, 4, 4, "CONFIRMED"); // upcoming
  await apptAt(-3, 13, 4, 0, 0, "COMPLETED"); // history
  await apptAt(-6, 16, 4, 3, 2, "COMPLETED"); // history

  // Social planner content (visible in the owner's portal).
  await prisma.socialPost.createMany({
    data: [
      { tenantId: tenant.id, barberId: owner.id, caption: "Fresh fade Friday 💈 Book your spot this weekend!", platforms: ["INSTAGRAM", "FACEBOOK"], status: "SCHEDULED", scheduledFor: addDays(new Date(), 2) },
      { tenantId: tenant.id, barberId: owner.id, caption: "Behind the chair with Deion — skin fade in 4K 🔥", platforms: ["INSTAGRAM"], status: "DRAFT" },
      { tenantId: tenant.id, barberId: owner.id, caption: "Father & son cuts all month. Tag a dad!", platforms: ["FACEBOOK"], status: "IDEA" },
      { tenantId: tenant.id, barberId: owner.id, caption: "Hot towel shave appreciation post ♨️", platforms: ["INSTAGRAM", "TIKTOK"], status: "POSTED" },
    ],
  });

  console.log(`✓ Demo tenant ready (public): /t/${tenant.slug} — ${services.length} services, ${barbers.length} barbers`);

  // Populate the Platform Admin view with additional tenants, applications, and activity.
  await seedPlatform(prisma);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
