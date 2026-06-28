import type { PrismaClient, User, Client, TenantStatus, Plan, BetaStatus, AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subHours, setHours, setMinutes, startOfDay } from "date-fns";

// Extra tenants so the Platform Admin (/admin) has a populated multi-tenant view.
type TenantSpec = {
  slug: string; name: string; status: TenantStatus; plan: Plan; color: string;
  tagline: string; phone: string; address: string; ownerName: string;
  barbers: string[]; serviceCount: number; apptCount: number; seed: number;
};

const TENANTS: TenantSpec[] = [
  { slug: "fade-factory", name: "Fade Factory", status: "ACTIVE", plan: "PRO", color: "#2dd4bf", tagline: "Where the fade is king.", phone: "(555) 240-1100", address: "44 Industrial Ave", ownerName: "Terrence Hall", barbers: ["Mike Okafor", "Jordan Beck", "Ray Castillo"], serviceCount: 6, apptCount: 12, seed: 1 },
  { slug: "the-gentlemans-cut", name: "The Gentleman's Cut", status: "ACTIVE", plan: "STARTER", color: "#ef4444", tagline: "Old-school service, modern style.", phone: "(555) 240-1200", address: "9 Royal Street", ownerName: "Edward Price", barbers: ["Sam Whitfield", "Owen Park"], serviceCount: 5, apptCount: 9, seed: 2 },
  { slug: "sharp-edges", name: "Sharp Edges Barber Co.", status: "ACTIVE", plan: "PRO", color: "#3b82f6", tagline: "Lines so clean they hurt.", phone: "(555) 240-1300", address: "210 Canal Road", ownerName: "Hector Ramos", barbers: ["Danny Cole", "Iggy Flores", "Tomás León"], serviceCount: 6, apptCount: 14, seed: 3 },
  { slug: "classic-clippers", name: "Classic Clippers", status: "ACTIVE", plan: "STARTER", color: "#f59e0b", tagline: "Your neighborhood barbershop.", phone: "(555) 240-1400", address: "88 Maple Street", ownerName: "Walter Boone", barbers: ["Curtis Wynn", "Pete Salas"], serviceCount: 4, apptCount: 7, seed: 4 },
  { slug: "urban-mane", name: "Urban Mane", status: "PENDING", plan: "TRIAL", color: "#a855f7", tagline: "City cuts, sharp vibes.", phone: "(555) 240-1500", address: "1 Market Plaza", ownerName: "Devin Okoro", barbers: ["Leo Tran"], serviceCount: 4, apptCount: 4, seed: 5 },
  { slug: "king-cuts", name: "King Cuts", status: "ACTIVE", plan: "PRO", color: "#10b981", tagline: "Treat every client like royalty.", phone: "(555) 240-1600", address: "300 Crown Blvd", ownerName: "Marcus Webb", barbers: ["Jamal Reed", "Nico Bauer", "Andre Foss"], serviceCount: 6, apptCount: 13, seed: 6 },
  { slug: "the-barber-lounge", name: "The Barber Lounge", status: "SUSPENDED", plan: "STARTER", color: "#64748b", tagline: "Relax. Get fresh.", phone: "(555) 240-1700", address: "57 Lounge Way", ownerName: "Gregory Tate", barbers: ["Chad Voss"], serviceCount: 5, apptCount: 6, seed: 7 },
  { slug: "first-chair-grooming", name: "First Chair Grooming", status: "PENDING", plan: "TRIAL", color: "#ec4899", tagline: "Grooming, elevated.", phone: "(555) 240-1800", address: "12 Harbor Lane", ownerName: "Bianca Russo", barbers: ["Theo Mensah", "Quinn Park"], serviceCount: 4, apptCount: 3, seed: 8 },
];

const SERVICE_TEMPLATES = [
  { name: "Haircut", description: "Cut and style.", durationMin: 30, priceCents: 3500 },
  { name: "Skin Fade", description: "Crisp bald fade.", durationMin: 40, priceCents: 4000 },
  { name: "Beard Trim", description: "Shape and line.", durationMin: 20, priceCents: 2000 },
  { name: "Cut + Beard", description: "The full refresh.", durationMin: 50, priceCents: 5500 },
  { name: "Hot Towel Shave", description: "Traditional straight-razor shave.", durationMin: 30, priceCents: 3000 },
  { name: "Kids Cut", description: "Ages 10 and under.", durationMin: 20, priceCents: 2200 },
];

const FIRST = ["Liam", "Noah", "Ethan", "Mason", "Logan", "Aiden", "James", "Caleb", "Ryan", "Diego", "Marcus", "Andre", "Tyler", "Omar", "Nathan", "Jesse"];
const LAST = ["Walker", "Bennett", "Hayes", "Brooks", "Reyes", "Carter", "Foster", "Diaz", "Murphy", "Cole", "Webb", "Ford", "Nash", "Bryant", "Cruz", "Stone"];

export async function seedPlatform(prisma: PrismaClient) {
  const now = new Date();

  // Clean prior platform-demo rows so re-running stays idempotent.
  await prisma.auditLog.deleteMany({ where: { meta: { path: ["demo"], equals: true } } });
  await prisma.betaApplication.deleteMany({ where: { email: { endsWith: "@betademo.test" } } });

  const hash = await bcrypt.hash("demo1234", 10);
  const created: { spec: TenantSpec; id: string; ownerId: string; barberIds: string[] }[] = [];

  for (const t of TENANTS) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: { status: t.status, plan: t.plan, primaryColor: t.color, name: t.name },
      create: {
        slug: t.slug, name: t.name, status: t.status, plan: t.plan, primaryColor: t.color,
        tagline: t.tagline, email: `hello@${t.slug}.test`, phone: t.phone, address: t.address,
      },
    });

    const owner = await prisma.user.upsert({
      where: { email: `owner@${t.slug}.test` },
      update: { tenantId: tenant.id, role: "OWNER" },
      create: { tenantId: tenant.id, email: `owner@${t.slug}.test`, name: t.ownerName, role: "OWNER", passwordHash: hash, bio: "Shop owner." },
    });

    const barbers: User[] = [];
    for (let i = 0; i < t.barbers.length; i++) {
      barbers.push(
        await prisma.user.upsert({
          where: { email: `barber${i + 1}@${t.slug}.test` },
          update: { tenantId: tenant.id, role: "BARBER", active: t.status !== "SUSPENDED" },
          create: { tenantId: tenant.id, email: `barber${i + 1}@${t.slug}.test`, name: t.barbers[i], role: "BARBER", passwordHash: hash, bio: "Barber." },
        }),
      );
    }

    // Reset this tenant's content (scoped — these are demo tenants only).
    await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.service.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.workingHour.deleteMany({ where: { tenantId: tenant.id } });

    for (const staff of [owner, ...barbers]) {
      for (const dow of [1, 2, 3, 4, 5, 6]) {
        await prisma.workingHour.create({ data: { tenantId: tenant.id, barberId: staff.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 19 * 60 } });
      }
    }

    await prisma.service.createMany({
      data: SERVICE_TEMPLATES.slice(0, t.serviceCount).map((s, i) => ({ tenantId: tenant.id, ...s, sortOrder: i })),
    });
    const services = await prisma.service.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: "asc" } });

    const clients: Client[] = [];
    for (let i = 0; i < 6; i++) {
      const name = `${FIRST[(i + t.seed) % FIRST.length]} ${LAST[(i * 2 + t.seed) % LAST.length]}`;
      clients.push(await prisma.client.create({
        data: { tenantId: tenant.id, name, email: `client${i}@${t.slug}.test`, phone: `(555) ${300 + i}-${1000 + t.seed}`, notes: i % 3 === 0 ? "Prefers a low fade." : null },
      }));
    }

    // Appointments: ~60% past (mostly COMPLETED, some CANCELLED/NO_SHOW), rest upcoming CONFIRMED.
    for (let i = 0; i < t.apptCount; i++) {
      const past = i < Math.floor(t.apptCount * 0.6);
      const svc = services[i % services.length];
      const barber = barbers[i % barbers.length] ?? owner;
      const client = clients[i % clients.length];
      const dayOffset = past ? -(1 + (i % 14)) : 1 + (i % 14);
      const hour = 9 + (i % 8);
      const base = past ? subDays(now, -dayOffset) : addDays(now, dayOffset);
      const start = setMinutes(setHours(startOfDay(base), hour), (i % 2) * 30);
      let status: AppointmentStatus = "CONFIRMED";
      if (past) status = i % 9 === 0 ? "NO_SHOW" : i % 7 === 0 ? "CANCELLED" : "COMPLETED";
      await prisma.appointment.create({
        data: { tenantId: tenant.id, serviceId: svc.id, barberId: barber.id, clientId: client.id, startTime: start, endTime: new Date(start.getTime() + svc.durationMin * 60000), status },
      });
    }

    created.push({ spec: t, id: tenant.id, ownerId: owner.id, barberIds: barbers.map((b) => b.id) });
  }

  // ── Beta applications (varied statuses) ──
  const pending = [
    { businessName: "Lincoln Barber Co.", ownerName: "Paul Lincoln", message: "Two-chair shop downtown, ready to move off paper." },
    { businessName: "Westside Cuts", ownerName: "Hassan Ali", message: "We do 200 cuts a week and need online booking." },
    { businessName: "The Dapper Den", ownerName: "Robert Shaw", message: "Upscale grooming lounge, want a branded site." },
    { businessName: "Crown & Comb", ownerName: "Marie Dubois", message: "New shop opening next month." },
    { businessName: "Ace of Fades", ownerName: "Tony Marino", message: "Need to cut down on no-shows." },
    { businessName: "Maple Street Barbers", ownerName: "Greg Olsen", message: "Family shop, 3 barbers." },
  ];
  const rejected = [
    { businessName: "Test Spam LLC", ownerName: "No Name", message: "asdf" },
    { businessName: "Out of Region Shop", ownerName: "Pat Lee", message: "Not a barbershop — nail salon." },
  ];

  let bi = 0;
  for (const a of pending) {
    await prisma.betaApplication.create({
      data: { ...a, email: `apply${bi}@betademo.test`, phone: `(555) 9${10 + bi}-2000`, status: "PENDING", createdAt: subHours(now, 6 + bi * 9) },
    });
    bi++;
  }
  // Approved applications mapped to already-provisioned tenants.
  for (let k = 0; k < 3; k++) {
    const c = created[k];
    await prisma.betaApplication.create({
      data: {
        businessName: c.spec.name, ownerName: c.spec.ownerName, email: `apply${bi}@betademo.test`,
        phone: c.spec.phone, message: "Excited to get started!", status: "APPROVED",
        provisionedTenantId: c.id, reviewedAt: subDays(now, 3 + k), createdAt: subDays(now, 6 + k),
      },
    });
    bi++;
  }
  for (const a of rejected) {
    await prisma.betaApplication.create({
      data: { ...a, email: `apply${bi}@betademo.test`, status: "REJECTED", reviewedAt: subDays(now, 2), createdAt: subDays(now, 5) },
    });
    bi++;
  }

  // ── Audit logs (recent activity feed) ──
  const logSpecs: { action: string; tenantIdx: number | null; target: string }[] = [
    { action: "tenant.provisioned", tenantIdx: 0, target: created[0].spec.slug },
    { action: "tenant.provisioned", tenantIdx: 2, target: created[2].spec.slug },
    { action: "beta.applied", tenantIdx: null, target: "Westside Cuts" },
    { action: "beta.applied", tenantIdx: null, target: "Crown & Comb" },
    { action: "admin.approved", tenantIdx: null, target: created[1].spec.slug },
    { action: "appointment.created", tenantIdx: 0, target: "appointment" },
    { action: "appointment.created", tenantIdx: 3, target: "appointment" },
    { action: "appointment.cancelled", tenantIdx: 5, target: "appointment" },
    { action: "appointment.status", tenantIdx: 2, target: "appointment" },
    { action: "service.created", tenantIdx: 1, target: "Cut + Beard" },
    { action: "service.created", tenantIdx: 5, target: "Hot Towel Shave" },
    { action: "team.created", tenantIdx: 0, target: "barber2@fade-factory.test" },
    { action: "tenant.updated", tenantIdx: 3, target: created[3].spec.slug },
    { action: "admin.tenant.status", tenantIdx: 6, target: created[6].spec.slug },
    { action: "appointment.created", tenantIdx: 6, target: "appointment" },
    { action: "appointment.rescheduled", tenantIdx: 0, target: "appointment" },
    { action: "beta.applied", tenantIdx: null, target: "Ace of Fades" },
    { action: "tenant.updated", tenantIdx: 5, target: created[5].spec.slug },
    { action: "appointment.created", tenantIdx: 2, target: "appointment" },
    { action: "team.created", tenantIdx: 2, target: "barber3@sharp-edges.test" },
  ];

  for (let i = 0; i < logSpecs.length; i++) {
    const s = logSpecs[i];
    await prisma.auditLog.create({
      data: {
        action: s.action,
        target: s.target,
        tenantId: s.tenantIdx === null ? null : created[s.tenantIdx].id,
        meta: { demo: true },
        createdAt: subHours(now, 2 + i * 7),
      },
    });
  }

  const apptTotal = await prisma.appointment.count();
  console.log(`✓ Platform demo: ${TENANTS.length} extra tenants, ${bi} beta applications, ${logSpecs.length} audit entries, ${apptTotal} total appointments`);
}
