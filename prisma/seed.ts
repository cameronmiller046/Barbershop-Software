import { PrismaClient } from "@prisma/client";
import type { User, Client } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, setHours, setMinutes, startOfDay } from "date-fns";
import { seedPlatform } from "./seed-platform";

const prisma = new PrismaClient();

const DEMO_SLUG = "professional-barbershop";

async function main() {
  // ── Superadmin (internal role PLATFORM_ADMIN, presented as "Superadmin") ──
  const primaryEmail = (process.env.PLATFORM_ADMIN_EMAIL || "cameronmiller046@gmail.com").toLowerCase();
  const primaryPass = process.env.PLATFORM_ADMIN_PASSWORD || "Ieokkyz7";

  // Remove the legacy default admin if it lingers from earlier seeds.
  await prisma.user.deleteMany({ where: { email: "admin@thechair.app", role: "PLATFORM_ADMIN" } });

  await prisma.user.upsert({
    where: { email: primaryEmail },
    update: { role: "PLATFORM_ADMIN", passwordHash: await bcrypt.hash(primaryPass, 10), tenantId: null },
    create: { email: primaryEmail, name: "Cameron Miller", role: "PLATFORM_ADMIN", passwordHash: await bcrypt.hash(primaryPass, 10) },
  });
  console.log(`✓ Superadmin: ${primaryEmail} / ${primaryPass}`);

  // ── Demo tenant: Professional Barbershop & Salon (public, no login required) ──
  // Note: "Admin123 / Admin123" is seeded below as a BARBER of THIS shop (not a
  // platform admin) so the shop's portal can be demoed from the storefront footer.
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_SLUG },
    update: {
      status: "ACTIVE",
      name: "Professional Barber & Beauty Salon",
      tagline: "Barbershop & beauty salon — Stone Mountain, GA.",
      primaryColor: "#C9A24B", // gold
      phone: "404-317-5068",
      address: "4847 Memorial Dr, Stone Mountain, GA 30083",
      slotIntervalMin: 30,
      googleRating: 4.6,
    },
    create: {
      slug: DEMO_SLUG,
      name: "Professional Barber & Beauty Salon",
      status: "ACTIVE",
      plan: "PRO",
      tagline: "Barbershop & beauty salon — Stone Mountain, GA.",
      primaryColor: "#C9A24B",
      email: "hello@professionalbarbershop.com",
      phone: "404-317-5068",
      address: "4847 Memorial Dr, Stone Mountain, GA 30083",
      slotIntervalMin: 30,
      googleRating: 4.6,
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

  // Remove any other barber profiles for this store — only Admin123 remains.
  await prisma.user.deleteMany({ where: { tenantId: tenant.id, role: "BARBER", email: { not: "admin123" } } });

  // The single barber on this shop: Admin123 (login admin123 / Admin123).
  const admin123 = await prisma.user.upsert({
    where: { email: "admin123" },
    update: {
      tenantId: tenant.id, role: "BARBER", name: "Admin123", active: true,
      bio: "Senior barber & shop manager.", instagramHandle: "professionalbarbershop",
      avatarUrl: "https://i.pravatar.cc/240?img=53", passwordHash: await bcrypt.hash("Admin123", 10),
      // HR fields (read-only to the user; admin-managed)
      hireDate: new Date("2019-03-15"), dateOfBirth: new Date("1991-08-02"),
      // Grant Shop settings without making them an Admin (per-user permission override).
      permissionOverrides: { "shop.settings": true },
    },
    create: {
      tenantId: tenant.id, email: "admin123", name: "Admin123", role: "BARBER",
      passwordHash: await bcrypt.hash("Admin123", 10), bio: "Senior barber & shop manager.",
      instagramHandle: "professionalbarbershop", avatarUrl: "https://i.pravatar.cc/240?img=53",
      hireDate: new Date("2019-03-15"), dateOfBirth: new Date("1991-08-02"),
      permissionOverrides: { "shop.settings": true },
    },
  });
  const barbers: User[] = [admin123];

  // Store hours (30-min booking intervals are set on the tenant):
  //   Mon–Fri 10:00–19:30 · Sat 9:00–17:30 · Sun 12:00–18:00
  const STORE_HOURS: Record<number, [number, number]> = {
    1: [600, 1170], 2: [600, 1170], 3: [600, 1170], 4: [600, 1170], 5: [600, 1170],
    6: [540, 1050], 0: [720, 1080],
  };
  for (const staff of [owner, admin123]) {
    for (const [dow, [startMin, endMin]] of Object.entries(STORE_HOURS)) {
      await prisma.workingHour.create({
        data: { tenantId: tenant.id, barberId: staff.id, dayOfWeek: Number(dow), startMin, endMin },
      });
    }
  }

  // Services — barber + beauty (all booked with the one barber).
  await prisma.service.createMany({
    data: [
      { tenantId: tenant.id, name: "Haircut", description: "Consultation, cut, and style.", durationMin: 30, priceCents: 3500, sortOrder: 0, imageUrl: "https://picsum.photos/seed/cut1/600/400" },
      { tenantId: tenant.id, name: "Skin Fade", description: "Bald fade with crisp lines.", durationMin: 30, priceCents: 4000, sortOrder: 1, imageUrl: "https://picsum.photos/seed/fade2/600/400" },
      { tenantId: tenant.id, name: "Beard Trim & Shape", description: "Lineup and conditioning.", durationMin: 30, priceCents: 2500, sortOrder: 2, imageUrl: "https://picsum.photos/seed/beard3/600/400" },
      { tenantId: tenant.id, name: "Cut + Beard Combo", description: "The full refresh.", durationMin: 60, priceCents: 5500, sortOrder: 3, imageUrl: "https://picsum.photos/seed/combo4/600/400" },
      { tenantId: tenant.id, name: "Women's Cut & Style", description: "Wash, cut, and blow-dry.", durationMin: 60, priceCents: 6500, sortOrder: 4, imageUrl: "https://picsum.photos/seed/style5/600/400" },
      { tenantId: tenant.id, name: "Silk Press", description: "Smooth, sleek finish.", durationMin: 90, priceCents: 8000, sortOrder: 5, imageUrl: "https://picsum.photos/seed/silk6/600/400" },
      { tenantId: tenant.id, name: "Kids Cut", description: "Ages 10 and under.", durationMin: 30, priceCents: 2500, sortOrder: 6, imageUrl: "https://picsum.photos/seed/kids7/600/400" },
      { tenantId: tenant.id, name: "Hair Design / Parting", description: "Custom lines and creative design.", durationMin: 30, priceCents: 4500, sortOrder: 7, imageUrl: "https://picsum.photos/seed/design8/600/400" },
    ],
  });

  // Featured reviews (Google rating shown separately = 4.6).
  await prisma.review.createMany({
    data: [
      { tenantId: tenant.id, authorName: "Tyrese Artist", rating: 5, body: "Jazmyn always get my husband hair straight — best hairstylist I've seen do his hair. Greg did my hair the first time, he did a good job, he's gone be my new barber. This place is good, always great conversation an clean environment, keep up the good work. And Mike crazy self be having me dying laughing — he keep the energy going in the shop." },
      { tenantId: tenant.id, authorName: "Shurea Richardson", rating: 5, body: "My hair stylist took great care of me. Talked me through everything she was doing. Had great conversation and I really loved my hair in the end!!!" },
      { tenantId: tenant.id, authorName: "Zulu Adam", rating: 5, body: "I've been cutting my hair there for years and it's the best place in town, you should go and check it for yourself and you won't regret a thing, a thousand stars 🎶 ✨" },
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
  // Admin123's book (the only barber) — today, upcoming, and history so the
  // portal dashboard + calendar look alive.
  await apptAt(0, 10, 0, 0, 1, "CONFIRMED"); // today
  await apptAt(0, 12, 0, 3, 2, "CONFIRMED"); // today
  await apptAt(0, 15, 0, 4, 0, "CONFIRMED"); // today
  await apptAt(1, 11, 0, 1, 3, "CONFIRMED"); // tomorrow
  await apptAt(2, 14, 0, 5, 4, "CONFIRMED"); // upcoming
  await apptAt(4, 16, 0, 2, 1, "CONFIRMED"); // upcoming
  await apptAt(-3, 13, 0, 0, 0, "COMPLETED"); // history
  await apptAt(-6, 16, 0, 3, 2, "COMPLETED"); // history
  await apptAt(-9, 11, 0, 4, 3, "COMPLETED"); // history

  // Social planner content.
  await prisma.socialPost.createMany({
    data: [
      { tenantId: tenant.id, barberId: owner.id, caption: "Fresh fade Friday 💈 Book your spot this weekend!", platforms: ["INSTAGRAM", "FACEBOOK"], status: "SCHEDULED", scheduledFor: addDays(new Date(), 2) },
      { tenantId: tenant.id, barberId: owner.id, caption: "New silk press results — swipe to see the shine ✨", platforms: ["INSTAGRAM"], status: "DRAFT" },
      { tenantId: tenant.id, barberId: owner.id, caption: "Father & son cuts all month. Tag a dad!", platforms: ["FACEBOOK"], status: "IDEA" },
      { tenantId: tenant.id, barberId: owner.id, caption: "Great conversation, clean shop, sharp cuts ♨️", platforms: ["INSTAGRAM", "TIKTOK"], status: "POSTED" },
    ],
  });

  console.log(`✓ Demo tenant ready (public): /t/${tenant.slug} — ${services.length} services, ${barbers.length} barber`);

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
