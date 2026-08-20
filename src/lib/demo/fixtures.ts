// ─────────────────────────────────────────────────────────────────────────
// Demo sandbox — seeded fixtures.
//
// `seedDemoState()` returns a brand-new, deeply-cloned state object every time
// it's called. The provider calls it once on mount; a hard refresh remounts the
// provider and calls it again → the sandbox resets to exactly this baseline.
// Content is deterministic; only dates are anchored to "now" so the calendar
// and "today" screens always look live.
// ─────────────────────────────────────────────────────────────────────────

import { SEED_TEMPLATES } from "@/lib/messageTemplates";
import type {
  Appointment, ApptStatus, Availability, Campaign, Customer, DayHours, DemoNotification, DemoRole,
  Coupon, DemoState, InventoryItem, MsgTemplate, PhotoSet, Service, ShopSettings, Staff, TimeEntry,
} from "./types";

export const DEMO_ACTING_BARBER_ID = "s_bar1"; // "you" in the barber sandbox

// ── date helpers (anchored to a shared `now`) ───────────────────────────
const DAY = 86_400_000;
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function at(now: Date, dayOffset: number, hour: number, min: number) {
  const base = startOfDay(now);
  return new Date(base.getTime() + dayOffset * DAY + (hour * 60 + min) * 60_000);
}
const iso = (d: Date) => d.toISOString();

// ── staff ────────────────────────────────────────────────────────────────
function seedStaff(now: Date): Staff[] {
  return [
    { id: "s_owner", name: "Marcus Reed", level: "Owner", email: "marcus@thechair.demo", phone: "(555) 200-1000", color: "#d8b25c", active: true, hireDateISO: iso(new Date(now.getFullYear() - 7, 4, 1)), commissionRate: 0, hourlyCents: 0, specialties: ["Fades", "Classic cuts"], bio: "Owner & master barber. Runs the flagship chair." },
    { id: "s_mgr", name: "Renee Cole", level: "Manager", email: "renee@thechair.demo", phone: "(555) 200-1001", color: "#8b5cf6", active: true, hireDateISO: iso(new Date(now.getFullYear() - 4, 8, 12)), commissionRate: 45, hourlyCents: 2200, specialties: ["Color", "Scissor work"], bio: "Shop manager. Keeps the day running on time." },
    { id: "s_bar1", name: "Andre Foster", level: "Barber", email: "andre@thechair.demo", phone: "(555) 200-1002", color: "#34d399", active: true, hireDateISO: iso(new Date(now.getFullYear() - 3, 2, 15)), commissionRate: 55, hourlyCents: 1600, specialties: ["Skin fades", "Beard design", "Line-ups"], bio: "Senior barber. Known for razor-sharp fades." },
    { id: "s_bar2", name: "Devin Brooks", level: "Barber", email: "devin@thechair.demo", phone: "(555) 200-1003", color: "#38bdf8", active: true, hireDateISO: iso(new Date(now.getFullYear() - 2, 6, 3)), commissionRate: 50, hourlyCents: 1600, specialties: ["Tapers", "Kids cuts"], bio: "Fast, friendly, great with first-timers." },
    { id: "s_bar3", name: "Sofia Nunez", level: "Barber", email: "sofia@thechair.demo", phone: "(555) 200-1004", color: "#f472b6", active: true, hireDateISO: iso(new Date(now.getFullYear() - 1, 10, 20)), commissionRate: 50, hourlyCents: 1600, specialties: ["Hot towel shaves", "Gray blending"], bio: "Traditional straight-razor specialist." },
  ];
}

// ── services ───────────────────────────────────────────────────────────────
function seedServices(): Service[] {
  return [
    { id: "sv_cut", name: "Signature Cut", category: "Hair", durationMin: 30, priceCents: 3500, active: true, description: "Consultation, cut and style." },
    { id: "sv_fade", name: "Skin Fade", category: "Hair", durationMin: 40, priceCents: 4000, active: true, description: "Crisp bald fade, blended to skin." },
    { id: "sv_beard", name: "Beard Trim", category: "Beard", durationMin: 20, priceCents: 2000, active: true, description: "Shape, line and condition." },
    { id: "sv_combo", name: "Cut + Beard", category: "Combo", durationMin: 50, priceCents: 5500, active: true, description: "The full refresh — cut and beard." },
    { id: "sv_shave", name: "Hot Towel Shave", category: "Shave", durationMin: 30, priceCents: 3000, active: true, description: "Traditional straight-razor shave." },
    { id: "sv_kids", name: "Kids Cut", category: "Hair", durationMin: 20, priceCents: 2200, active: true, description: "Ages 10 and under." },
    { id: "sv_lineup", name: "Line-Up", category: "Beard", durationMin: 15, priceCents: 1500, active: true, description: "Edge-up and clean neckline." },
    { id: "sv_design", name: "Hair Design", category: "Hair", durationMin: 45, priceCents: 4500, active: false, description: "Custom parts and patterns (seasonal)." },
  ];
}

// ── customers ─────────────────────────────────────────────────────────────
const CUST_SEED: [string, string, string, string[], number, number][] = [
  // name, email, phone, tags, visits, totalSpent$
  ["Jordan Smith", "jordan@example.com", "(555) 300-1001", ["Regular", "VIP"], 24, 1080],
  ["Avery Brooks", "avery@example.com", "(555) 300-1002", ["Regular"], 12, 480],
  ["Sam Rivera", "sam@example.com", "(555) 300-1003", ["New"], 2, 90],
  ["Taylor Quinn", "taylor@example.com", "(555) 300-1004", ["Regular", "Beard"], 18, 900],
  ["Casey Morgan", "casey@example.com", "(555) 300-1005", ["VIP"], 31, 1705],
  ["Diego Ramirez", "diego@example.com", "(555) 300-1006", ["Regular"], 9, 405],
  ["Noah Bennett", "noah@example.com", "(555) 300-1007", ["New"], 1, 40],
  ["Ethan Walker", "ethan@example.com", "(555) 300-1008", ["Regular", "Kids"], 15, 330],
  ["Marcus Hayes", "marcus.h@example.com", "(555) 300-1009", ["VIP", "Shave"], 27, 1350],
  ["Omar Nasir", "omar@example.com", "(555) 300-1010", ["Regular"], 7, 315],
  ["Tyler Foster", "tyler@example.com", "(555) 300-1011", ["Lapsed"], 5, 200],
  ["Caleb Ward", "caleb@example.com", "(555) 300-1012", ["Regular"], 14, 700],
];

function seedCustomers(now: Date): Customer[] {
  const notes: Record<number, string> = {
    0: "Prefers scissor over clipper on top. Allergic to menthol.",
    3: "Beard is the priority — keep the cheek line high.",
    4: "Always books the hot towel shave. Big tipper.",
    7: "Son Leo, 8 — no buzz on top, he's ticklish around the ears.",
  };
  return CUST_SEED.map(([name, email, phone, tags, visits, spent], i) => ({
    id: `c_${i + 1}`,
    name, email, phone,
    notes: notes[i] ?? "",
    tags,
    visits,
    // The last three clients lapsed months ago so win-back audiences have
    // real people in them; everyone else visited recently.
    lastVisitISO: iso(at(now, -(i >= CUST_SEED.length - 3 ? 65 + (CUST_SEED.length - i) * 12 : 2 + i), 11, 0)),
    totalSpentCents: spent * 100,
    createdAtISO: iso(at(now, -(30 + i * 9), 9, 0)),
  }));
}

// ── appointments ──────────────────────────────────────────────────────────
// [dayOffset, hour, min, staffIdx, custIdx, svcIdx, status]
const APPT_PLAN: [number, number, number, number, number, number, ApptStatus][] = [
  // Today — a full board, several on the acting barber (staff idx 2 = Andre)
  [0, 9, 0, 2, 0, 1, "completed"],
  [0, 9, 30, 3, 2, 0, "completed"],
  [0, 10, 0, 2, 3, 3, "in_service"],
  [0, 10, 0, 4, 4, 4, "checked_in"],
  [0, 11, 0, 1, 5, 0, "confirmed"],
  [0, 11, 30, 2, 8, 6, "confirmed"],
  [0, 13, 0, 2, 9, 1, "scheduled"],
  [0, 14, 0, 3, 7, 5, "scheduled"],
  [0, 15, 0, 4, 11, 2, "scheduled"],
  [0, 16, 0, 2, 1, 3, "scheduled"],
  [0, 17, 0, 1, 10, 0, "scheduled"],
  // Tomorrow
  [1, 10, 0, 2, 4, 3, "confirmed"],
  [1, 11, 30, 3, 6, 0, "confirmed"],
  [1, 14, 0, 2, 0, 1, "scheduled"],
  [1, 15, 30, 4, 8, 4, "scheduled"],
  // Later this week
  [2, 12, 0, 2, 3, 6, "scheduled"],
  [3, 13, 0, 3, 5, 0, "scheduled"],
  [4, 16, 0, 2, 9, 3, "scheduled"],
  // Past (for reports / history)
  [-1, 10, 0, 2, 0, 1, "completed"],
  [-1, 12, 0, 2, 4, 3, "completed"],
  [-1, 15, 0, 3, 2, 0, "completed"],
  [-2, 11, 0, 2, 8, 4, "completed"],
  [-2, 14, 0, 4, 5, 0, "no_show"],
  [-3, 10, 30, 2, 3, 1, "completed"],
  [-3, 13, 0, 3, 7, 5, "completed"],
  [-4, 16, 0, 2, 0, 3, "completed"],
  [-5, 11, 0, 4, 9, 4, "cancelled"],
  [-6, 12, 0, 2, 1, 1, "completed"],
  [-7, 15, 0, 3, 4, 0, "completed"],
  [-9, 10, 0, 2, 8, 3, "completed"],
];

function seedAppointments(now: Date, staff: Staff[], services: Service[], customers: Customer[]): Appointment[] {
  return APPT_PLAN.map(([d, h, m, si, ci, vi, status], idx) => {
    const svc = services[vi];
    const start = at(now, d, h, m);
    const end = new Date(start.getTime() + svc.durationMin * 60_000);
    const done = status === "completed";
    return {
      id: `a_${idx + 1}`,
      customerId: customers[ci].id,
      staffId: staff[si].id,
      serviceId: svc.id,
      startISO: iso(start),
      endISO: iso(end),
      status,
      priceCents: svc.priceCents,
      tipCents: done ? Math.round(svc.priceCents * (idx % 3 === 0 ? 0.2 : idx % 3 === 1 ? 0.15 : 0.1)) : 0,
      paymentMethod: done ? (idx % 4 === 0 ? "cash" : "card") : null,
      notes: "",
    };
  });
}

// ── inventory ─────────────────────────────────────────────────────────────
function seedInventory(): InventoryItem[] {
  const rows: [string, string, string, number, number, number, number, string][] = [
    ["Pomade — Matte Clay", "Styling", "PM-001", 24, 10, 620, 1800, "Layrite"],
    ["Sea Salt Spray", "Styling", "SS-002", 8, 12, 540, 1600, "Baxter"],
    ["Beard Oil — Cedar", "Beard", "BO-003", 31, 10, 480, 1500, "Honest Amish"],
    ["Shave Cream", "Shave", "SC-004", 5, 8, 380, 1200, "Proraso"],
    ["Neck Strips (box)", "Supplies", "NS-005", 3, 6, 220, 0, "Supply Co"],
    ["Clipper Blades", "Tools", "CB-006", 12, 4, 1400, 0, "Wahl"],
    ["Disposable Razors (100)", "Supplies", "DR-007", 2, 5, 1900, 0, "Bevel"],
    ["Aftershave Balm", "Shave", "AB-008", 17, 8, 560, 1700, "Nivea Men"],
    ["Hair Tonic", "Styling", "HT-009", 14, 6, 640, 1900, "American Crew"],
    ["Barbicide (gal)", "Supplies", "BC-010", 6, 3, 1100, 0, "Barbicide"],
  ];
  return rows.map(([name, category, sku, stock, reorderLevel, unitCostCents, retailCents, supplier], i) => ({
    id: `inv_${i + 1}`, name, category, sku, stock, reorderLevel, unitCostCents, retailCents, supplier,
  }));
}

// ── time entries ──────────────────────────────────────────────────────────
function seedTimeEntries(now: Date, staff: Staff[]): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const barbers = staff.filter((s) => s.level === "Barber");
  // Past week: each barber worked 9–17 on weekdays.
  for (let d = 1; d <= 6; d++) {
    const day = at(now, -d, 0, 0);
    if (day.getDay() === 0) continue; // closed Sunday
    barbers.forEach((b, bi) => {
      entries.push({
        id: `te_${d}_${bi}`,
        staffId: b.id,
        clockInISO: iso(at(now, -d, 9, bi * 4)),
        clockOutISO: iso(at(now, -d, 17, 30 + bi * 5)),
        note: "",
      });
    });
  }
  // Today: the acting barber is currently clocked in (no clock-out yet).
  entries.push({ id: "te_today", staffId: DEMO_ACTING_BARBER_ID, clockInISO: iso(at(now, 0, 8, 52)), clockOutISO: null, note: "" });
  return entries;
}

// ── notifications ─────────────────────────────────────────────────────────
function seedNotifications(now: Date): DemoNotification[] {
  const rows: [DemoNotification["kind"], string, string, number, boolean][] = [
    ["appointment", "New online booking", "Sam Rivera booked a Signature Cut for tomorrow at 10:00.", 1, false],
    ["inventory", "Low stock alert", "Sea Salt Spray is below its reorder level (8 left).", 3, false],
    ["review", "New 5★ review", "“Best fade in the city. Andre never misses.” — Casey M.", 6, false],
    ["appointment", "Appointment cancelled", "Tyler Foster cancelled his Friday line-up.", 20, true],
    ["payroll", "Payroll ready", "This period's payroll is ready to review and run.", 26, true],
    ["system", "Backup complete", "Your shop data was backed up successfully.", 30, true],
  ];
  return rows.map(([kind, title, body, hAgo, read], i) => ({
    id: `n_${i + 1}`, kind, title, body, read,
    createdISO: iso(new Date(now.getTime() - hAgo * 3_600_000)),
  }));
}

// ── campaigns ─────────────────────────────────────────────────────────────
function seedCampaigns(now: Date): Campaign[] {
  return [
    { id: "cmp_1", name: "Fall Fade Special", channel: "Email", status: "Sent", audience: "All clients", recipients: 812, openRate: 0.42, revenueCents: 214000, sentISO: iso(at(now, -12, 9, 0)), couponCode: "FALLFADE" },
    { id: "cmp_2", name: "We miss you — 20% off", channel: "SMS", status: "Sent", audience: "Lapsed (60+ days)", recipients: 134, openRate: 0.78, revenueCents: 96500, sentISO: iso(at(now, -5, 10, 0)), couponCode: "COMEBACK20" },
    { id: "cmp_3", name: "Holiday Gift Cards", channel: "Email", status: "Scheduled", audience: "VIP", recipients: 96, openRate: 0, revenueCents: 0, sentISO: iso(at(now, 3, 9, 0)), couponCode: null },
    { id: "cmp_4", name: "Refer-a-friend launch", channel: "Social", status: "Draft", audience: "All clients", recipients: 0, openRate: 0, revenueCents: 0, sentISO: null, couponCode: "FRIEND10" },
  ];
}

// ── before/after photos (CSS gradients, no real assets) ─────────────────────
function seedPhotos(now: Date): PhotoSet[] {
  const g = (a: string, b: string) => `linear-gradient(135deg, ${a}, ${b})`;
  return [
    { id: "ph_1", customerId: "c_1", serviceId: "sv_fade", staffId: "s_bar1", createdISO: iso(at(now, -1, 10, 40)), note: "Mid-fade → skin fade, textured top.", beforeStyle: g("#3f3f46", "#27272a"), afterStyle: g("#d8b25c", "#a9772f") },
    { id: "ph_2", customerId: "c_4", serviceId: "sv_combo", staffId: "s_bar1", createdISO: iso(at(now, -3, 11, 20)), note: "Beard shaped, cheek line raised.", beforeStyle: g("#334155", "#1e293b"), afterStyle: g("#34d399", "#059669") },
    { id: "ph_3", customerId: "c_9", serviceId: "sv_shave", staffId: "s_bar1", createdISO: iso(at(now, -6, 15, 10)), note: "Full hot-towel straight razor shave.", beforeStyle: g("#57534e", "#292524"), afterStyle: g("#38bdf8", "#0284c7") },
    { id: "ph_4", customerId: "c_5", serviceId: "sv_cut", staffId: "s_bar1", createdISO: iso(at(now, -9, 13, 0)), note: "Grown out → clean scissor cut.", beforeStyle: g("#44403c", "#1c1917"), afterStyle: g("#f472b6", "#db2777") },
  ];
}

// ── settings + availability ─────────────────────────────────────────────────
const H = (open: number | null, close: number | null): DayHours => ({ open, close });
function seedSettings(): ShopSettings {
  return {
    name: "The Chair — Flagship",
    tagline: "Where the fade is king.",
    phone: "(555) 200-1000",
    email: "hello@thechair.demo",
    address: "128 Barber Row, Atlanta, GA 30301",
    primaryColor: "#d8b25c",
    bookingBufferMin: 10,
    cancellationHours: 24,
    hours: [
      H(720, 1080),  // Sun 12–18
      H(600, 1170),  // Mon 10–19:30
      H(600, 1170),  // Tue
      H(600, 1170),  // Wed
      H(600, 1170),  // Thu
      H(600, 1170),  // Fri
      H(540, 1050),  // Sat 9–17:30
    ],
    notifyEmail: true,
    notifySms: true,
    onlineBooking: true,
  };
}

function seedAvailability(): Availability {
  return {
    hours: [
      H(null, null),  // Sun off
      H(600, 1080),   // Mon 10–18
      H(600, 1080),   // Tue
      H(600, 1080),   // Wed
      H(660, 1170),   // Thu 11–19:30
      H(540, 1050),   // Fri 9–17:30
      H(540, 960),    // Sat 9–16
    ],
  };
}

// ── coupons ────────────────────────────────────────────────────────────────
function seedCoupons(now: Date): Coupon[] {
  return [
    { id: "cpn_1", code: "FALLFADE", label: "15% off any service", kind: "percent", value: 15, active: true, expiresISO: iso(at(now, 21, 23, 59)), campaignId: "cmp_1", redemptions: 38, revenueCents: 214000 },
    { id: "cpn_2", code: "COMEBACK20", label: "20% off your next visit", kind: "percent", value: 20, active: true, expiresISO: iso(at(now, 14, 23, 59)), campaignId: "cmp_2", redemptions: 17, revenueCents: 96500 },
    { id: "cpn_3", code: "FRIEND10", label: "$10 off for referred friends", kind: "amount", value: 1000, active: true, expiresISO: null, campaignId: "cmp_4", redemptions: 0, revenueCents: 0 },
    { id: "cpn_4", code: "SUMMER5", label: "$5 off — expired promo", kind: "amount", value: 500, active: false, expiresISO: iso(at(now, -30, 23, 59)), campaignId: null, redemptions: 52, revenueCents: 187300 },
  ];
}

// ── message templates ────────────────────────────────────────────
// Shares the real product's starter copy (lib/messageTemplates is pure — no
// Prisma, no server imports) so the sandbox shows exactly what a new shop gets.
function seedTemplates(): MsgTemplate[] {
  return SEED_TEMPLATES.map((t) => ({
    id: `tpl_${t.seedKey}`,
    name: t.name,
    channel: t.channel,
    category: t.category,
    subject: t.subject ?? null,
    body: t.body,
    active: true,
  }));
}

/** Build a complete, fresh sandbox state. Called once per demo session mount. */
export function seedDemoState(role: DemoRole): DemoState {
  const now = new Date();
  const staff = seedStaff(now);
  const services = seedServices();
  const customers = seedCustomers(now);
  return {
    role,
    currentStaffId: DEMO_ACTING_BARBER_ID,
    seededAtISO: iso(now),
    staff,
    services,
    customers,
    appointments: seedAppointments(now, staff, services, customers),
    inventory: seedInventory(),
    timeEntries: seedTimeEntries(now, staff),
    notifications: seedNotifications(now),
    campaigns: seedCampaigns(now),
    photos: seedPhotos(now),
    settings: seedSettings(),
    availability: seedAvailability(),
    templates: seedTemplates(),
    sentMessages: [],
    extraExpenses: [],
    coupons: seedCoupons(now),
    seq: 1,
  };
}
