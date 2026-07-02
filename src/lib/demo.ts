import type { PrismaClient, User, Client, TenantStatus, Plan, AppointmentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subHours, setHours, setMinutes, startOfDay, startOfMonth, subMonths, getDaysInMonth, getDate } from "date-fns";

export const DEMO_SLUG = "professional-barbershop";

// Permanent flagship demo logins. Easy to remember — password == username.
//   test1 / test1 → Manager (OWNER)      test2 / test2 → Barber (BARBER)
export const FLAGSHIP_MANAGER_EMAIL = "test1";
export const FLAGSHIP_BARBER_EMAIL = "test2";
export const DEMO_GOAL_CENTS = 1500000; // $15,000/mo demo sales goal

// Flagship store hours: Mon–Fri 10:00–19:30 · Sat 9:00–17:30 · Sun 12:00–18:00
const STORE_HOURS: Record<number, [number, number]> = {
  1: [600, 1170], 2: [600, 1170], 3: [600, 1170], 4: [600, 1170], 5: [600, 1170],
  6: [540, 1050], 0: [720, 1080],
};

/** True if demo data has been loaded (more than just the flagship store exists). */
export async function demoLoaded(prisma: PrismaClient) {
  return (await prisma.tenant.count()) > 1;
}

/**
 * Reset to the clean baseline: only the Superadmin user and the flagship store
 * (its services, reviews, and branding kept). Everything else is removed.
 */
export async function clearDemoData(prisma: PrismaClient) {
  // 1) Delete every store except the flagship (cascades their users + data).
  await prisma.tenant.deleteMany({ where: { slug: { not: DEMO_SLUG } } });

  // 2) Wipe demo content from the flagship (keep services + reviews + branding).
  const main = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (main) {
    await prisma.appointment.deleteMany({ where: { tenantId: main.id } });
    await prisma.client.deleteMany({ where: { tenantId: main.id } });
    await prisma.socialPost.deleteMany({ where: { tenantId: main.id } });
    await prisma.galleryItem.deleteMany({ where: { tenantId: main.id } });
    await prisma.workingHour.deleteMany({ where: { tenantId: main.id } });
  }

  // 3) Remove non-superadmin users, EXCEPT the permanent flagship demo logins.
  await prisma.user.deleteMany({
    where: { role: { not: "PLATFORM_ADMIN" }, email: { notIn: [FLAGSHIP_MANAGER_EMAIL, FLAGSHIP_BARBER_EMAIL] } },
  });

  // 4) Clear platform demo artifacts.
  await prisma.betaApplication.deleteMany({});
  await prisma.auditLog.deleteMany({ where: { meta: { path: ["demo"], equals: true } } });
  await prisma.pageView.deleteMany({});

  // 5) Keep the flagship Manager/Barber logins (test1/test2) — so the portal is
  //    always demoable, even from this clean baseline (step 2 wiped their hours).
  await ensureFlagshipStaff(prisma);
}

/**
 * Make sure the flagship demo shop has data — used by the "View as Demo …"
 * buttons so the portal is never empty on a fresh deployment. Idempotent and
 * cheap when data already exists.
 */
export async function ensureDemoData(prisma: PrismaClient) {
  const flagship = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true, monthlyGoalCents: true } });
  if (!flagship) return;
  const count = await prisma.appointment.count({ where: { tenantId: flagship.id } });
  // Reseed if empty OR if the demo is out of date (goal not yet the current
  // target) — this refreshes stale live demos to the latest data + $15k goal.
  if (count < 20 || flagship.monthlyGoalCents !== DEMO_GOAL_CENTS) {
    await seedFlagshipDemo(prisma);
  }
}

/** Load a ton of demo data: flagship staff + appointments, plus 8 extra stores. */
export async function loadDemoData(prisma: PrismaClient) {
  await seedFlagshipDemo(prisma);
  await seedExtraStores(prisma);
  await seedTraffic(prisma);
}

/** Anonymous demo traffic (~30 days) so the admin Analytics dashboard is alive. */
async function seedTraffic(prisma: PrismaClient) {
  await prisma.pageView.deleteMany({});
  const tenants = await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true, slug: true } });
  if (tenants.length === 0) return;

  const now = new Date();
  const subpages = ["services", "book", "reviews", "contact", "faq"];
  const sources = ["google", "google", "instagram", "instagram", "direct", "direct", "direct", "facebook", "referral", "yelp"];
  const devices = ["mobile", "mobile", "mobile", "desktop", "desktop", "tablet"]; // mobile-heavy
  const rows: Prisma.PageViewCreateManyInput[] = [];

  for (let d = 29; d >= 0; d--) {
    const day = subDays(now, d);
    for (let ti = 0; ti < tenants.length; ti++) {
      const t = tenants[ti];
      const sessions = 4 + ((29 - d) % 5) + (ti % 4); // grows slightly toward present
      for (let s = 0; s < sessions; s++) {
        const seed = d * 131 + ti * 17 + s * 7;
        const device = devices[seed % devices.length];
        const source = sources[(seed >> 1) % sources.length];
        const visitorHash = `demo-${d}-${ti}-${s}`; // unique per session/day → realistic visitor counts
        const depth = 1 + (seed % 3); // 1–3 pageviews along the funnel
        for (let p = 0; p < depth; p++) {
          const page = p === 0 ? "home" : subpages[(seed + p) % subpages.length];
          const path = page === "home" ? `/t/${t.slug}` : `/t/${t.slug}/${page}`;
          const createdAt = setMinutes(setHours(startOfDay(day), 9 + ((seed + p) % 12)), (seed + p * 13) % 60);
          rows.push({ tenantId: t.id, path, page, source, device, visitorHash, createdAt });
        }
      }
    }
  }

  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.pageView.createMany({ data: rows.slice(i, i + 1000) });
  }
}

/**
 * Create (or refresh) the two permanent flagship demo logins and their working
 * hours. Idempotent, and survives clearDemoData so the portal is always
 * demoable: test1 / test1 → Manager (OWNER), test2 / test2 → Barber (BARBER).
 * Returns null if the flagship store hasn't been seeded yet.
 */
export async function ensureFlagshipStaff(prisma: PrismaClient) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (!tenant) return null;

  // Drop any legacy demo logins from earlier seeds so they don't linger as
  // orphan staff on the flagship Team page.
  await prisma.user.deleteMany({
    where: { email: { in: ["admin123", "owner@professionalbarbershop.com", "barber@professionalbarbershop.com"] } },
  });

  // No permission overrides on the barber, so the role contrast stays clean.
  const manager = await prisma.user.upsert({
    where: { email: FLAGSHIP_MANAGER_EMAIL },
    update: {
      tenantId: tenant.id, role: "OWNER", name: "Marcus Reed", active: true,
      bio: "Owner & master barber — runs the shop.", instagramHandle: "marcus.thebarber",
      avatarUrl: "https://i.pravatar.cc/240?img=12", passwordHash: await bcrypt.hash(FLAGSHIP_MANAGER_EMAIL, 10),
      permissionOverrides: Prisma.JsonNull,
    },
    create: {
      tenantId: tenant.id, email: FLAGSHIP_MANAGER_EMAIL, name: "Marcus Reed",
      role: "OWNER", passwordHash: await bcrypt.hash(FLAGSHIP_MANAGER_EMAIL, 10), bio: "Owner & master barber — runs the shop.",
      instagramHandle: "marcus.thebarber", avatarUrl: "https://i.pravatar.cc/240?img=12",
      hireDate: new Date("2017-05-01"), dateOfBirth: new Date("1985-11-20"),
    },
  });
  const barber = await prisma.user.upsert({
    where: { email: FLAGSHIP_BARBER_EMAIL },
    update: {
      tenantId: tenant.id, role: "BARBER", name: "Devon Carter", active: true,
      bio: "Senior barber — fades & beard work.", instagramHandle: "devoncuts",
      avatarUrl: "https://i.pravatar.cc/240?img=53", passwordHash: await bcrypt.hash(FLAGSHIP_BARBER_EMAIL, 10),
      permissionOverrides: Prisma.JsonNull,
    },
    create: {
      tenantId: tenant.id, email: FLAGSHIP_BARBER_EMAIL, name: "Devon Carter",
      role: "BARBER", passwordHash: await bcrypt.hash(FLAGSHIP_BARBER_EMAIL, 10), bio: "Senior barber — fades & beard work.",
      instagramHandle: "devoncuts", avatarUrl: "https://i.pravatar.cc/240?img=53",
      hireDate: new Date("2019-03-15"), dateOfBirth: new Date("1991-08-02"),
    },
  });

  // Refresh just these two staff's working hours (idempotent).
  await prisma.workingHour.deleteMany({ where: { tenantId: tenant.id, barberId: { in: [manager.id, barber.id] } } });
  for (const staff of [manager, barber]) {
    for (const [dow, [startMin, endMin]] of Object.entries(STORE_HOURS)) {
      await prisma.workingHour.create({ data: { tenantId: tenant.id, barberId: staff.id, dayOfWeek: Number(dow), startMin, endMin } });
    }
  }
  return { tenant, manager, barber };
}

// ───────────────────────── Flagship store demo ─────────────────────────

export async function seedFlagshipDemo(prisma: PrismaClient) {
  // Ensure the two permanent demo logins exist + have working hours.
  const staff = await ensureFlagshipStaff(prisma);
  if (!staff) return;
  const { tenant, manager, barber } = staff;

  // The demo shop runs on the full Enterprise plan with a $15k/mo goal.
  await prisma.tenant.update({ where: { id: tenant.id }, data: { plan: "ENTERPRISE", monthlyGoalCents: DEMO_GOAL_CENTS } });

  // Idempotent: clear prior flagship demo appointments + clients.
  await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.client.deleteMany({ where: { tenantId: tenant.id } });

  const services = await prisma.service.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: "asc" } });
  if (services.length === 0) return;

  const clientFirst = ["Jordan", "Avery", "Sam", "Taylor", "Casey", "Marcus", "Andre", "Devon", "Isaiah", "Malik", "Xavier", "Terrence", "Damon", "Elijah", "Corey", "Trey", "Rashad", "Darius", "Omar", "Julian", "Kevin", "Brandon", "Chris", "Tyrone"];
  const clientLast = ["Smith", "Brooks", "Rivera", "Quinn", "Morgan", "Hayes", "Reed", "Carter", "Foster", "Bryant", "Cole", "Webb", "Nash", "Cruz", "Ford", "Stone", "Diaz", "Bennett", "Walker", "Reyes", "Murphy", "Harris", "Bell", "Grant"];
  const clientNames: [string, string, string][] = clientFirst.map((f, i) => [
    `${f} ${clientLast[i % clientLast.length]}`, `${f.toLowerCase()}${i}@example.com`, `(555) 200-${1001 + i}`,
  ]);
  const clients: Client[] = [];
  for (const [name, email, phone] of clientNames) {
    clients.push(await prisma.client.create({ data: { tenantId: tenant.id, name, email, phone } }));
  }

  const now = new Date();
  // Appointments are split across both staff so the two roles demo distinctly:
  //   • the Manager's dashboard shows the WHOLE shop (both columns + combined revenue);
  //   • the Barber's dashboard shows only Devon's own book — a clear subset.
  // Each gets bookings today, upcoming, and completed (so revenue stats populate).
  const appt = (staff: User, dayOffset: number, hour: number, svcIdx: number, clientIdx: number, status: AppointmentStatus) => {
    const svc = services[svcIdx % services.length];
    const base = dayOffset < 0 ? subDays(now, -dayOffset) : addDays(now, dayOffset);
    const start = setMinutes(setHours(startOfDay(base), hour), 0);
    return prisma.appointment.create({
      data: {
        tenantId: tenant.id, serviceId: svc.id, barberId: staff.id, clientId: clients[clientIdx].id,
        startTime: start, endTime: new Date(start.getTime() + svc.durationMin * 60000), status,
      },
    });
  };
  // Today — both chairs busy.
  await appt(barber, 0, 10, 0, 1, "CONFIRMED");
  await appt(manager, 0, 11, 3, 2, "CONFIRMED");
  await appt(barber, 0, 15, 4, 0, "CONFIRMED");
  await appt(manager, 0, 17, 1, 4, "CONFIRMED");
  // Upcoming this week and beyond.
  await appt(barber, 1, 11, 1, 3, "CONFIRMED");
  await appt(manager, 1, 14, 4, 0, "CONFIRMED");
  await appt(barber, 2, 14, 5, 4, "CONFIRMED");
  await appt(manager, 3, 12, 2, 1, "CONFIRMED");
  await appt(barber, 4, 16, 2, 1, "CONFIRMED");
  // ── Realized history: ~12 months of completed appointments so the Reports
  //    dashboard (12-month chart, monthly table, daily trend) looks like a real,
  //    growing shop. Built in bulk via createMany. ──
  const staffPair = [manager, barber];
  const REFERRALS = ["Walk-by / sign", "Google", "Instagram", "Friend / referral", "Returning customer", "Other"];
  const hist: Prisma.AppointmentCreateManyInput[] = [];
  const pushCompleted = (start: Date, svcIdx: number, staffIdx: number, clientIdx: number) => {
    const svc = services[svcIdx % services.length];
    // Turnaround: service duration ± a little variance, 5-minute floor.
    const durMin = Math.max(5, svc.durationMin + ((svcIdx * 7) % 15) - 5);
    hist.push({
      tenantId: tenant.id, serviceId: svc.id, barberId: staffPair[staffIdx % staffPair.length].id,
      clientId: clients[clientIdx % clients.length].id, startTime: start,
      endTime: new Date(start.getTime() + svc.durationMin * 60000), status: "COMPLETED",
      startedAt: start, finishedAt: new Date(start.getTime() + durMin * 60000),
      collectedCents: svc.priceCents + ((clientIdx % 3) * 500), // list price + occasional tip
      kind: svcIdx % 4 === 0 ? "WALKIN" : "APPOINTMENT",
      referral: REFERRALS[(svcIdx + clientIdx) % REFERRALS.length],
    });
  };

  // Full past months (1–11 months ago), volume trending up toward the present.
  for (let m = 11; m >= 1; m--) {
    const monthStart = startOfMonth(subMonths(now, m));
    const dim = getDaysInMonth(monthStart);
    const count = 320 + (12 - m) * 20; // ~340 → ~560 cuts/month (very busy shop, trending up)
    for (let i = 0; i < count; i++) {
      const day = 1 + ((i * 5 + m * 3) % dim);
      const hour = 10 + (i % 8);
      const start = setMinutes(setHours(startOfDay(addDays(monthStart, day - 1)), hour), (i % 2) * 30);
      pushCompleted(start, i + m, i, i * 3 + m);
    }
  }
  // Current month, days already elapsed (up to yesterday), ~1–2 cuts/day.
  const thisMonthStart = startOfMonth(now);
  const today = getDate(now);
  let c = 0;
  for (let day = 1; day < today; day++) {
    const per = 12 + (day % 3) * 2; // ~12–16 cuts/day so far this month
    for (let k = 0; k < per; k++) {
      const hour = 10 + (c % 8);
      const start = setMinutes(setHours(startOfDay(addDays(thisMonthStart, day - 1)), hour), (k % 2) * 30);
      pushCompleted(start, c, c, c * 2);
      c++;
    }
  }
  if (hist.length) await prisma.appointment.createMany({ data: hist });
}

// ───────────────────────── Extra stores (platform view) ─────────────────────────

type TenantSpec = {
  slug: string; name: string; status: TenantStatus; plan: Plan; color: string;
  tagline: string; phone: string; address: string; ownerName: string;
  barbers: string[]; serviceCount: number; apptCount: number; seed: number;
};

const TENANTS: TenantSpec[] = [
  { slug: "fade-factory", name: "Fade Factory", status: "ACTIVE", plan: "ENTERPRISE", color: "#2dd4bf", tagline: "Where the fade is king.", phone: "(555) 240-1100", address: "44 Industrial Ave, Chicago, IL", ownerName: "Terrence Hall", barbers: ["Mike Okafor", "Jordan Beck", "Ray Castillo"], serviceCount: 6, apptCount: 12, seed: 1 },
  { slug: "the-gentlemans-cut", name: "The Gentleman's Cut", status: "ACTIVE", plan: "PRO", color: "#ef4444", tagline: "Old-school service, modern style.", phone: "(555) 240-1200", address: "9 Royal Street, New Orleans, LA", ownerName: "Edward Price", barbers: ["Sam Whitfield", "Owen Park"], serviceCount: 5, apptCount: 9, seed: 2 },
  { slug: "sharp-edges", name: "Sharp Edges Barber Co.", status: "ACTIVE", plan: "ENTERPRISE", color: "#3b82f6", tagline: "Lines so clean they hurt.", phone: "(555) 240-1300", address: "210 Canal Road, Houston, TX", ownerName: "Hector Ramos", barbers: ["Danny Cole", "Iggy Flores", "Tomás León"], serviceCount: 6, apptCount: 14, seed: 3 },
  { slug: "classic-clippers", name: "Classic Clippers", status: "ACTIVE", plan: "PRO", color: "#f59e0b", tagline: "Your neighborhood barbershop.", phone: "(555) 240-1400", address: "88 Maple Street, Columbus, OH", ownerName: "Walter Boone", barbers: ["Curtis Wynn", "Pete Salas"], serviceCount: 4, apptCount: 7, seed: 4 },
  { slug: "urban-mane", name: "Urban Mane", status: "PENDING", plan: "SOLO", color: "#a855f7", tagline: "City cuts, sharp vibes.", phone: "(555) 240-1500", address: "1 Market Plaza, San Francisco, CA", ownerName: "Devin Okoro", barbers: ["Leo Tran"], serviceCount: 4, apptCount: 4, seed: 5 },
  { slug: "king-cuts", name: "King Cuts", status: "ACTIVE", plan: "ENTERPRISE", color: "#10b981", tagline: "Treat every client like royalty.", phone: "(555) 240-1600", address: "300 Crown Blvd, Atlanta, GA", ownerName: "Marcus Webb", barbers: ["Jamal Reed", "Nico Bauer", "Andre Foss"], serviceCount: 6, apptCount: 13, seed: 6 },
  { slug: "the-barber-lounge", name: "The Barber Lounge", status: "SUSPENDED", plan: "PRO", color: "#64748b", tagline: "Relax. Get fresh.", phone: "(555) 240-1700", address: "57 Lounge Way, Miami, FL", ownerName: "Gregory Tate", barbers: ["Chad Voss"], serviceCount: 5, apptCount: 6, seed: 7 },
  { slug: "first-chair-grooming", name: "First Chair Grooming", status: "PENDING", plan: "SOLO", color: "#ec4899", tagline: "Grooming, elevated.", phone: "(555) 240-1800", address: "12 Harbor Lane, Seattle, WA", ownerName: "Bianca Russo", barbers: ["Theo Mensah", "Quinn Park"], serviceCount: 4, apptCount: 3, seed: 8 },
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

async function seedExtraStores(prisma: PrismaClient) {
  const now = new Date();
  await prisma.auditLog.deleteMany({ where: { meta: { path: ["demo"], equals: true } } });
  await prisma.betaApplication.deleteMany({ where: { email: { endsWith: "@betademo.test" } } });

  const hash = await bcrypt.hash("demo1234", 10);
  const created: { spec: TenantSpec; id: string }[] = [];

  // Random store numbers (1–999), unique across all stores.
  const usedNums = new Set((await prisma.tenant.findMany({ select: { storeNumber: true } })).map((t) => t.storeNumber));
  const pickNum = () => { let n = Math.floor(Math.random() * 999) + 1; while (usedNums.has(n)) n = Math.floor(Math.random() * 999) + 1; usedNums.add(n); return n; };

  for (const t of TENANTS) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: { status: t.status, plan: t.plan, primaryColor: t.color, name: t.name, isDemo: true },
      create: { slug: t.slug, name: t.name, storeNumber: pickNum(), status: t.status, plan: t.plan, primaryColor: t.color, tagline: t.tagline, email: `hello@${t.slug}.test`, phone: t.phone, address: t.address, isDemo: true },
    });

    const owner = await prisma.user.upsert({
      where: { email: `owner@${t.slug}.test` },
      update: { tenantId: tenant.id, role: "OWNER" },
      create: { tenantId: tenant.id, email: `owner@${t.slug}.test`, name: t.ownerName, role: "OWNER", passwordHash: hash, bio: "Shop manager." },
    });

    const barbers: User[] = [];
    for (let i = 0; i < t.barbers.length; i++) {
      barbers.push(await prisma.user.upsert({
        where: { email: `barber${i + 1}@${t.slug}.test` },
        update: { tenantId: tenant.id, role: "BARBER", active: t.status !== "SUSPENDED" },
        create: { tenantId: tenant.id, email: `barber${i + 1}@${t.slug}.test`, name: t.barbers[i], role: "BARBER", passwordHash: hash, bio: "Barber." },
      }));
    }

    await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.client.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.service.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.workingHour.deleteMany({ where: { tenantId: tenant.id } });

    for (const staff of [owner, ...barbers]) {
      for (const dow of [1, 2, 3, 4, 5, 6]) {
        await prisma.workingHour.create({ data: { tenantId: tenant.id, barberId: staff.id, dayOfWeek: dow, startMin: 9 * 60, endMin: 19 * 60 } });
      }
    }

    await prisma.service.createMany({ data: SERVICE_TEMPLATES.slice(0, t.serviceCount).map((s, i) => ({ tenantId: tenant.id, ...s, sortOrder: i })) });
    const services = await prisma.service.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: "asc" } });

    const clients: Client[] = [];
    for (let i = 0; i < 6; i++) {
      const name = `${FIRST[(i + t.seed) % FIRST.length]} ${LAST[(i * 2 + t.seed) % LAST.length]}`;
      clients.push(await prisma.client.create({ data: { tenantId: tenant.id, name, email: `client${i}@${t.slug}.test`, phone: `(555) ${300 + i}-${1000 + t.seed}` } }));
    }

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
      await prisma.appointment.create({ data: { tenantId: tenant.id, serviceId: svc.id, barberId: barber.id, clientId: client.id, startTime: start, endTime: new Date(start.getTime() + svc.durationMin * 60000), status } });
    }

    created.push({ spec: t, id: tenant.id });
  }

  // Beta applications
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
    await prisma.betaApplication.create({ data: { ...a, email: `apply${bi}@betademo.test`, phone: `(555) 9${10 + bi}-2000`, status: "PENDING", createdAt: subHours(now, 6 + bi * 9) } });
    bi++;
  }
  for (let k = 0; k < 3; k++) {
    const c = created[k];
    await prisma.betaApplication.create({ data: { businessName: c.spec.name, ownerName: c.spec.ownerName, email: `apply${bi}@betademo.test`, phone: c.spec.phone, message: "Excited to get started!", status: "APPROVED", provisionedTenantId: c.id, reviewedAt: subDays(now, 3 + k), createdAt: subDays(now, 6 + k) } });
    bi++;
  }
  for (const a of rejected) {
    await prisma.betaApplication.create({ data: { ...a, email: `apply${bi}@betademo.test`, status: "REJECTED", reviewedAt: subDays(now, 2), createdAt: subDays(now, 5) } });
    bi++;
  }

  // Audit log activity feed
  const logSpecs: { action: string; tenantIdx: number | null; target: string }[] = [
    { action: "tenant.provisioned", tenantIdx: 0, target: created[0].spec.slug },
    { action: "tenant.provisioned", tenantIdx: 2, target: created[2].spec.slug },
    { action: "beta.applied", tenantIdx: null, target: "Westside Cuts" },
    { action: "beta.applied", tenantIdx: null, target: "Crown & Comb" },
    { action: "admin.approved", tenantIdx: null, target: created[1].spec.slug },
    { action: "appointment.created", tenantIdx: 0, target: "appointment" },
    { action: "appointment.created", tenantIdx: 3, target: "appointment" },
    { action: "appointment.cancelled", tenantIdx: 5, target: "appointment" },
    { action: "service.created", tenantIdx: 1, target: "Cut + Beard" },
    { action: "team.created", tenantIdx: 0, target: "barber2@fade-factory.test" },
    { action: "tenant.updated", tenantIdx: 3, target: created[3].spec.slug },
    { action: "appointment.created", tenantIdx: 6, target: "appointment" },
    { action: "tenant.updated", tenantIdx: 5, target: created[5].spec.slug },
    { action: "appointment.created", tenantIdx: 2, target: "appointment" },
  ];
  for (let i = 0; i < logSpecs.length; i++) {
    const s = logSpecs[i];
    await prisma.auditLog.create({
      data: { action: s.action, target: s.target, tenantId: s.tenantIdx === null ? null : created[s.tenantIdx].id, meta: { demo: true }, createdAt: subHours(now, 2 + i * 7) },
    });
  }
}
