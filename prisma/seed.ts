import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || "admin@thechair.app").toLowerCase();
  const adminPass = process.env.PLATFORM_ADMIN_PASSWORD || "admin1234";
  const ownerEmail = (process.env.DEMO_OWNER_EMAIL || "owner@professionalbarbershop.com").toLowerCase();
  const ownerPass = process.env.DEMO_OWNER_PASSWORD || "demo1234";

  // ── Platform admin ──
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Platform Admin",
      role: "PLATFORM_ADMIN",
      passwordHash: await bcrypt.hash(adminPass, 10),
    },
  });
  console.log(`✓ Platform admin: ${adminEmail} / ${adminPass}`);

  // ── Demo tenant: Professional Barbershop ──
  const tenant = await prisma.tenant.upsert({
    where: { slug: "professional-barbershop" },
    update: {},
    create: {
      slug: "professional-barbershop",
      name: "Professional Barbershop",
      status: "ACTIVE",
      plan: "PRO",
      tagline: "Precision cuts in a classic chair.",
      primaryColor: "#c9a24b",
      email: "hello@professionalbarbershop.com",
      phone: "(555) 018-2244",
      address: "128 Main Street, Downtown",
    },
  });

  // Owner
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      email: ownerEmail,
      name: "Marcus Reed",
      role: "OWNER",
      passwordHash: await bcrypt.hash(ownerPass, 10),
      bio: "Owner & master barber. 15 years behind the chair.",
    },
  });
  console.log(`✓ Demo owner: ${ownerEmail} / ${ownerPass}`);

  // Barbers
  const barbersData = [
    { email: "deion@professionalbarbershop.com", name: "Deion Carter", bio: "Fades and beard sculpting specialist.", instagramHandle: "deioncuts" },
    { email: "luis@professionalbarbershop.com", name: "Luis Romero", bio: "Classic scissor work and hot-towel shaves.", instagramHandle: "luistrim" },
  ];
  const barbers = [owner];
  for (const b of barbersData) {
    const barber = await prisma.user.upsert({
      where: { email: b.email },
      update: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id, email: b.email, name: b.name, role: "BARBER",
        passwordHash: await bcrypt.hash("demo1234", 10), bio: b.bio, instagramHandle: b.instagramHandle,
      },
    });
    barbers.push(barber);
  }

  // Working hours: Tue–Sat 9–6 for everyone
  for (const barber of barbers) {
    for (const dow of [2, 3, 4, 5, 6]) {
      await prisma.workingHour.upsert({
        where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: dow } },
        update: {},
        create: { tenantId: tenant.id, barberId: barber.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 18 * 60 },
      });
    }
  }

  // Services (only seed if none exist for this tenant)
  const existingServices = await prisma.service.count({ where: { tenantId: tenant.id } });
  if (existingServices === 0) {
    await prisma.service.createMany({
      data: [
        { tenantId: tenant.id, name: "Signature Haircut", description: "Consultation, cut, and style.", durationMin: 30, priceCents: 4000, sortOrder: 0 },
        { tenantId: tenant.id, name: "Skin Fade", description: "Bald fade with crisp lines.", durationMin: 40, priceCents: 4500, sortOrder: 1 },
        { tenantId: tenant.id, name: "Beard Trim & Shape", description: "Lineup and conditioning.", durationMin: 20, priceCents: 2500, sortOrder: 2 },
        { tenantId: tenant.id, name: "Cut + Beard Combo", description: "The complete refresh.", durationMin: 50, priceCents: 6000, sortOrder: 3 },
        { tenantId: tenant.id, name: "Hot Towel Shave", description: "Traditional straight-razor shave.", durationMin: 30, priceCents: 3500, sortOrder: 4 },
        { tenantId: tenant.id, name: "Kids Cut", description: "Ages 10 and under.", durationMin: 20, priceCents: 2500, sortOrder: 5 },
      ],
    });
  }

  // Reviews
  const existingReviews = await prisma.review.count({ where: { tenantId: tenant.id } });
  if (existingReviews === 0) {
    await prisma.review.createMany({
      data: [
        { tenantId: tenant.id, authorName: "James T.", rating: 5, body: "Best fade in the city. Deion never misses." },
        { tenantId: tenant.id, authorName: "Priya R.", rating: 5, body: "Booked online in 30 seconds, in and out, perfect cut." },
        { tenantId: tenant.id, authorName: "Online customer", rating: 4, body: "Great hot towel shave, super relaxing." },
      ],
    });
  }

  // Gallery (placeholder images)
  const existingGallery = await prisma.galleryItem.count({ where: { tenantId: tenant.id } });
  if (existingGallery === 0) {
    await prisma.galleryItem.createMany({
      data: [0, 1, 2, 3].map((i) => ({
        tenantId: tenant.id,
        imageUrl: `https://picsum.photos/seed/barber${i}/600/${500 + i * 40}`,
        caption: ["Fresh fade", "Beard sculpt", "Classic taper", "Lineup"][i],
        sortOrder: i,
      })),
    });
  }

  // A couple of sample upcoming appointments (next open day)
  const existingAppts = await prisma.appointment.count({ where: { tenantId: tenant.id } });
  if (existingAppts === 0) {
    const service = await prisma.service.findFirst({ where: { tenantId: tenant.id } });
    const client = await prisma.client.create({
      data: { tenantId: tenant.id, name: "Walk-in Sample", email: "sample@example.com", phone: "(555) 000-1111" },
    });
    if (service) {
      const day = startOfDay(addDays(new Date(), 1));
      const start = setMinutes(setHours(day, 10), 0);
      await prisma.appointment.create({
        data: {
          tenantId: tenant.id, serviceId: service.id, barberId: barbers[1].id, clientId: client.id,
          startTime: start, endTime: new Date(start.getTime() + service.durationMin * 60000), status: "CONFIRMED",
        },
      });
    }
  }

  console.log(`✓ Demo tenant ready: /t/${tenant.slug}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
