// ─────────────────────────────────────────────────────────────────────────
// Derived financials for the demo sandbox.
//
// Everything here is computed from the in-memory demo state (real appointment
// revenue) plus a deterministic simulated layer for the things the sandbox
// doesn't model — chair rental agreements, operating expenses and retail.
// Every Financials page reads from THIS module so Overview, Chair Rentals,
// Expenses, P&L and Transactions can never disagree with each other.
//
// Chair rent is deliberately NOT treated as barber service revenue: a renter's
// service income belongs to the renter, and only the rent (plus any agreed
// revenue share) is the shop's. See `chairRentals` / `shopProfit`.
// ─────────────────────────────────────────────────────────────────────────

import type { DemoState } from "./types";
import { totalRevenue, totalTips, isRevenue } from "./metrics";

export type RentFrequency = "Weekly" | "Monthly";
export type RentStatus = "Paid" | "Partial" | "Overdue" | "Upcoming";

export type ChairRental = {
  chairId: string;
  chairLabel: string;
  staffId: string | null;
  barberName: string;
  occupied: boolean;
  /** False for chairs the shop staffs itself (owner/manager) — no rent, and
   *  their service revenue is the shop's, so they sit outside the rental math. */
  isRental: boolean;
  /** Rent per billing cycle, in cents — what the agreement says ($250/week). */
  rentCents: number;
  /** Rent owed across the reporting month (weekly deals bill four times). */
  periodRentCents: number;
  /** Collected against `periodRentCents`. */
  paidCents: number;
  frequency: RentFrequency;
  status: RentStatus;
  dueDayISO: string;
  lastPaymentISO: string | null;
  nextPaymentISO: string;
  paymentMethod: string;
  gracePeriodDays: number;
  lateFeeCents: number;
  depositCents: number;
  agreementStartISO: string;
  agreementEndISO: string;
  /** Percent of service revenue the shop also takes (0 for pure rent deals). */
  revenueSharePct: number;
  // Performance — real, from the sandbox's appointments.
  serviceRevenueCents: number;
  clients: number;
  appointments: number;
  avgTicketCents: number;
  tipsCents: number;
  newClients: number;
  returningClients: number;
  noShowRate: number;
  rebookRate: number;
  retailCents: number;
  revenuePerHourCents: number;
  // Allocated share of chair expenses.
  expenseCents: number;
};

export type ExpenseAllocation = "Equal per occupied chair" | "Based on revenue" | "Manual" | "No allocation";

export type Expense = {
  id: string;
  dateISO: string;
  amountCents: number;
  category: string;
  vendor: string;
  chairId: string | null; // null = shared / shop-wide
  staffId: string | null;
  location: string;
  notes: string;
  recurring: boolean;
  allocation: ExpenseAllocation;
  /** True when this expense belongs to the rental-chair cost pool. */
  chairRelated: boolean;
};

export type Txn = {
  id: string;
  dateISO: string;
  description: string;
  type: "Service sale" | "Product sale" | "Chair rent" | "Expense" | "Refund" | "Payroll";
  category: string;
  barberName: string | null;
  chairLabel: string | null;
  location: string;
  method: string;
  amountCents: number; // positive = money in, negative = money out
  /**
   * False for a chair renter's own service sale: it runs through the shop's
   * book and card terminal, but the money is the renter's, not the shop's.
   * Those rows show in the ledger and are excluded from shop income totals.
   */
  shopIncome: boolean;
};

export const LOCATIONS = ["Main St.", "Midtown", "Buckhead", "Sandy Springs"] as const;
export const MAIN_LOCATION = "Main St.";

// Chair layout: 10 chairs, the first five mapped to the seeded staff. Chairs
// beyond the roster are either vacant or rented to simulated renters, which is
// what gives the occupancy view something to show.
// `rental: false` marks a chair the shop itself operates with an employee
// barber — their service revenue IS shop revenue and they're on payroll.
// Renters keep their own service income; the shop earns rent (+ any share).
const CHAIR_PLAN: { chair: string; staffId: string | null; simName?: string; rentCents: number; frequency: RentFrequency; revenueSharePct: number; rental: boolean }[] = [
  { chair: "Chair 01", staffId: "s_bar1", rentCents: 25000, frequency: "Weekly", revenueSharePct: 0, rental: true },
  { chair: "Chair 02", staffId: "s_bar2", rentCents: 25000, frequency: "Weekly", revenueSharePct: 0, rental: true },
  { chair: "Chair 03", staffId: "s_bar3", rentCents: 90000, frequency: "Monthly", revenueSharePct: 0, rental: true },
  { chair: "Chair 04", staffId: "s_mgr", rentCents: 0, frequency: "Monthly", revenueSharePct: 0, rental: false }, // manager — on payroll
  { chair: "Chair 05", staffId: "s_owner", rentCents: 0, frequency: "Monthly", revenueSharePct: 0, rental: false }, // owner's chair
  { chair: "Chair 06", staffId: null, simName: "Tobias Vance", rentCents: 25000, frequency: "Weekly", revenueSharePct: 0, rental: true },
  { chair: "Chair 07", staffId: null, simName: "Priya Raman", rentCents: 85000, frequency: "Monthly", revenueSharePct: 0, rental: true },
  { chair: "Chair 08", staffId: null, simName: "Kofi Mensah", rentCents: 25000, frequency: "Weekly", revenueSharePct: 15, rental: true },
  { chair: "Chair 09", staffId: null, rentCents: 25000, frequency: "Weekly", revenueSharePct: 0, rental: true }, // vacant
  { chair: "Chair 10", staffId: null, rentCents: 90000, frequency: "Monthly", revenueSharePct: 0, rental: true }, // vacant
];

/** Chairs the shop operates itself — their service revenue is shop revenue. */
export const SHOP_OPERATED_CHAIRS = CHAIR_PLAN.filter((c) => !c.rental).map((c) => c.chair);

// Rent-collection state per chair, held here so every page tells the same story.
const RENT_STATE: Record<string, { paidPct: number; status: RentStatus }> = {
  "Chair 01": { paidPct: 1, status: "Paid" },
  "Chair 02": { paidPct: 0, status: "Overdue" },
  "Chair 03": { paidPct: 1, status: "Paid" },
  "Chair 04": { paidPct: 1, status: "Paid" },
  "Chair 05": { paidPct: 1, status: "Paid" },
  "Chair 06": { paidPct: 0.6, status: "Partial" },
  "Chair 07": { paidPct: 1, status: "Paid" },
  "Chair 08": { paidPct: 1, status: "Paid" },
};

/** Weekly agreements bill four times inside the reporting month. */
const CYCLES_PER_MONTH: Record<RentFrequency, number> = { Weekly: 4, Monthly: 1 };

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** Deterministic 0..1 from a string — keeps simulated figures stable per chair. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

export type ServiceSale = {
  id: string; dateISO: string; staffId: string | null; barberName: string; chairId: string;
  serviceName: string; category: string; clientName: string; amountCents: number; tipCents: number;
  method: "Card" | "Cash" | "Mobile"; simulated: boolean;
};

/**
 * The period's service sales.
 *
 * The sandbox only seeds enough appointments to make the calendar look alive —
 * a few dozen — which is nowhere near a real shop's monthly volume. Financials
 * would then show chair rent swamping service revenue, which is backwards. So
 * the ledger is the real completed appointments PLUS deterministically
 * simulated ones at genuine menu prices, bringing each occupied chair up to a
 * believable month. Every financial page derives service revenue from THIS
 * list, so the Transactions ledger really does add up to the Overview KPIs.
 */
export function serviceLedger(state: DemoState): ServiceSale[] {
  const out: ServiceSale[] = [];
  const now = new Date();
  const chairOf = (staffId: string | null) => CHAIR_PLAN.find((c) => c.staffId === staffId)?.chair ?? "Chair 05";

  for (const a of state.appointments) {
    if (!isRevenue(a)) continue;
    const svc = state.services.find((v) => v.id === a.serviceId);
    const staff = state.staff.find((s) => s.id === a.staffId);
    const cust = state.customers.find((c) => c.id === a.customerId);
    out.push({
      id: `svc_${a.id}`, dateISO: a.startISO, staffId: a.staffId,
      barberName: staff?.name ?? "Barber", chairId: chairOf(a.staffId),
      serviceName: svc?.name ?? "Service", category: svc?.category ?? "Hair",
      clientName: cust?.name ?? "Client", amountCents: a.priceCents, tipCents: a.tipCents,
      method: a.paymentMethod === "cash" ? "Cash" : a.paymentMethod === "wallet" ? "Mobile" : "Card",
      simulated: false,
    });
  }

  // Top each occupied chair up to a realistic month of work.
  const menu = state.services.filter((s) => s.active);
  const names = state.customers.map((c) => c.name);
  for (const plan of CHAIR_PLAN) {
    const occupied = !!(plan.staffId || plan.simName);
    if (!occupied || !menu.length) continue;
    const staff = plan.staffId ? state.staff.find((s) => s.id === plan.staffId) : null;
    const barberName = staff?.name ?? plan.simName ?? "Barber";
    const already = out.filter((s) => s.chairId === plan.chair).length;
    const seed = hash01(plan.chair);
    const target = Math.round(62 + seed * 26); // 62–88 cuts a month
    for (let i = already; i < target; i++) {
      const r = hash01(`${plan.chair}:${i}`);
      const svc = menu[Math.floor(r * menu.length) % menu.length];
      const daysBack = Math.floor(r * 29);
      const hour = 9 + Math.floor(hash01(`${plan.chair}:h:${i}`) * 9);
      const d = addDays(now, -daysBack);
      d.setHours(hour, (i % 4) * 15, 0, 0);
      const tipPct = [0, 0.15, 0.18, 0.2][Math.floor(hash01(`${plan.chair}:t:${i}`) * 4) % 4];
      out.push({
        id: `svc_sim_${plan.chair}_${i}`, dateISO: iso(d), staffId: plan.staffId,
        barberName, chairId: plan.chair,
        serviceName: svc.name, category: svc.category,
        clientName: names[Math.floor(r * names.length) % names.length] ?? "Walk-in",
        amountCents: svc.priceCents, tipCents: Math.round(svc.priceCents * tipPct),
        method: r > 0.66 ? "Cash" : r > 0.12 ? "Card" : "Mobile",
        simulated: true,
      });
    }
  }

  return out.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

/** Per-chair performance, computed from the shared service ledger. */
function performanceOf(state: DemoState, ledger: ServiceSale[], chairId: string, staffId: string | null) {
  const mine = ledger.filter((s) => s.chairId === chairId);
  if (!mine.length) return null;
  const serviceRevenueCents = mine.reduce((s, x) => s + x.amountCents, 0);
  const tipsCents = mine.reduce((s, x) => s + x.tipCents, 0);
  const perClient = new Map<string, number>();
  for (const x of mine) perClient.set(x.clientName, (perClient.get(x.clientName) ?? 0) + 1);
  const returningClients = [...perClient.values()].filter((n) => n > 1).length;
  const minutes = mine.reduce((s, x) => {
    const svc = state.services.find((v) => v.name === x.serviceName);
    return s + (svc?.durationMin ?? 30);
  }, 0);
  // No-shows only exist for real sandbox appointments; simulated history is
  // assumed completed, so the rate is blended toward a plausible baseline.
  const realMine = staffId ? state.appointments.filter((a) => a.staffId === staffId) : [];
  const noShows = realMine.filter((a) => a.status === "no_show").length;
  const noShowRate = realMine.length ? noShows / realMine.length : 0.03 + hash01(chairId) * 0.04;
  return {
    serviceRevenueCents, tipsCents,
    appointments: mine.length,
    clients: perClient.size,
    avgTicketCents: Math.round(serviceRevenueCents / mine.length),
    noShowRate,
    newClients: perClient.size - returningClients,
    returningClients,
    revenuePerHourCents: minutes ? Math.round((serviceRevenueCents / minutes) * 60) : 0,
  };
}

/** Chair expenses (the rental cost pool) plus shop-wide operating expenses. */
export function expenses(state: DemoState): Expense[] {
  const now = new Date();
  const d = (back: number) => iso(addDays(now, -back));
  const rows: Omit<Expense, "id">[] = [
    { dateISO: d(2), amountCents: 20000, category: "Laundry", vendor: "FreshFold Linen Co.", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Weekly towel + cape service", recurring: true, allocation: "Equal per occupied chair", chairRelated: true },
    { dateISO: d(4), amountCents: 14500, category: "Cleaning", vendor: "SpotOn Janitorial", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Nightly floor + station clean", recurring: true, allocation: "Equal per occupied chair", chairRelated: true },
    { dateISO: d(5), amountCents: 8900, category: "Chair maintenance", vendor: "Belmont Service", chairId: "Chair 02", staffId: "s_bar2", location: MAIN_LOCATION, notes: "Hydraulic pump reseal", recurring: false, allocation: "No allocation", chairRelated: true },
    { dateISO: d(7), amountCents: 12400, category: "Equipment repairs", vendor: "Andis Repair Depot", chairId: "Chair 01", staffId: "s_bar1", location: MAIN_LOCATION, notes: "Clipper motor rebuild", recurring: false, allocation: "No allocation", chairRelated: true },
    { dateISO: d(9), amountCents: 31000, category: "Utilities", vendor: "Georgia Power", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Electricity — shared", recurring: true, allocation: "Based on revenue", chairRelated: true },
    { dateISO: d(11), amountCents: 9800, category: "Supplies", vendor: "Barber Depot", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Blades, neck strips, powder", recurring: false, allocation: "Equal per occupied chair", chairRelated: true },
    { dateISO: d(12), amountCents: 12900, category: "Booking software", vendor: "The Chair", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Barbershop plan — monthly", recurring: true, allocation: "Equal per occupied chair", chairRelated: true },
    { dateISO: d(14), amountCents: 18600, category: "Card processing", vendor: "Stripe", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Processing fees", recurring: true, allocation: "Based on revenue", chairRelated: true },
    { dateISO: d(16), amountCents: 24000, category: "Advertising", vendor: "Meta Ads", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Local awareness campaign", recurring: false, allocation: "No allocation", chairRelated: false },
    { dateISO: d(19), amountCents: 340000, category: "Rent", vendor: "Peachtree Holdings", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "Storefront lease", recurring: true, allocation: "No allocation", chairRelated: false },
    { dateISO: d(21), amountCents: 46000, category: "Insurance", vendor: "State Farm", chairId: null, staffId: null, location: MAIN_LOCATION, notes: "General liability", recurring: true, allocation: "No allocation", chairRelated: false },
    { dateISO: d(24), amountCents: 15500, category: "Furniture", vendor: "Takara Belmont", chairId: "Chair 09", staffId: null, location: MAIN_LOCATION, notes: "Replacement station mirror", recurring: false, allocation: "No allocation", chairRelated: true },
  ];
  return rows.map((r, i) => ({ ...r, id: `exp_${i + 1}` }));
}

/**
 * Chair rentals with rent, real service performance, and each chair's share of
 * the expense pool. Allocation follows each expense's own method: equal split
 * across occupied chairs, weighted by that chair's service revenue, or direct
 * when the expense names a chair.
 */
export function chairRentals(state: DemoState): ChairRental[] {
  const now = new Date();
  const exps = expenses(state);

  const ledger = serviceLedger(state);
  const base = CHAIR_PLAN.map((plan) => {
    const staff = plan.staffId ? state.staff.find((s) => s.id === plan.staffId) : null;
    const occupied = !!(staff || plan.simName);
    const perf = occupied ? performanceOf(state, ledger, plan.chair, plan.staffId) : null;
    const seed = hash01(plan.chair);
    return { plan, staff, occupied, perf, seed };
  });

  const occupiedCount = base.filter((b) => b.occupied).length;
  const revenueOf = (b: (typeof base)[number]) => b.perf?.serviceRevenueCents ?? 0;
  const totalChairRevenue = base.reduce((s, b) => s + (b.occupied ? revenueOf(b) : 0), 0) || 1;

  // Split every chair-related expense according to its allocation method.
  const allocated = new Map<string, number>();
  for (const b of base) allocated.set(b.plan.chair, 0);
  for (const e of exps) {
    if (!e.chairRelated) continue;
    if (e.chairId) {
      allocated.set(e.chairId, (allocated.get(e.chairId) ?? 0) + e.amountCents);
      continue;
    }
    if (e.allocation === "Equal per occupied chair") {
      const per = Math.round(e.amountCents / Math.max(1, occupiedCount));
      for (const b of base) if (b.occupied) allocated.set(b.plan.chair, (allocated.get(b.plan.chair) ?? 0) + per);
    } else if (e.allocation === "Based on revenue") {
      for (const b of base) {
        if (!b.occupied) continue;
        const share = Math.round(e.amountCents * (revenueOf(b) / totalChairRevenue));
        allocated.set(b.plan.chair, (allocated.get(b.plan.chair) ?? 0) + share);
      }
    }
  }

  return base.map(({ plan, staff, occupied, perf, seed }) => {
    const rentState = RENT_STATE[plan.chair] ?? { paidPct: 0, status: "Upcoming" as RentStatus };
    const rentCents = occupied ? plan.rentCents : 0;
    const periodRentCents = rentCents * CYCLES_PER_MONTH[plan.frequency];
    const paidCents = Math.round(periodRentCents * rentState.paidPct);
    const serviceRevenueCents = perf?.serviceRevenueCents ?? 0;
    const appointments = perf?.appointments ?? 0;
    const dueOffset = plan.frequency === "Weekly" ? 7 : 30;

    return {
      chairId: plan.chair,
      chairLabel: plan.chair,
      staffId: plan.staffId,
      barberName: staff?.name ?? plan.simName ?? "Vacant",
      occupied,
      isRental: plan.rental,
      rentCents,
      periodRentCents,
      paidCents,
      frequency: plan.frequency,
      status: occupied ? rentState.status : "Upcoming",
      dueDayISO: iso(addDays(now, plan.frequency === "Weekly" ? 3 : 11)),
      lastPaymentISO: paidCents > 0 ? iso(addDays(now, -Math.round(2 + seed * 8))) : null,
      nextPaymentISO: iso(addDays(now, dueOffset)),
      paymentMethod: seed > 0.5 ? "Bank transfer (ACH)" : "Card on file",
      gracePeriodDays: 3,
      lateFeeCents: 2500,
      depositCents: plan.frequency === "Weekly" ? 50000 : plan.rentCents,
      agreementStartISO: iso(new Date(now.getFullYear() - 1, Math.round(seed * 11), 1)),
      agreementEndISO: iso(new Date(now.getFullYear() + 1, Math.round(seed * 11), 28)),
      revenueSharePct: plan.revenueSharePct,
      serviceRevenueCents,
      clients: perf?.clients ?? 0,
      appointments,
      avgTicketCents: appointments ? Math.round(serviceRevenueCents / appointments) : 0,
      tipsCents: perf?.tipsCents ?? 0,
      newClients: perf?.newClients ?? 0,
      returningClients: perf?.returningClients ?? 0,
      noShowRate: perf?.noShowRate ?? 0.04 + seed * 0.05,
      rebookRate: 0.55 + seed * 0.3,
      retailCents: Math.round(serviceRevenueCents * 0.06),
      revenuePerHourCents: perf?.revenuePerHourCents ?? 0,
      expenseCents: allocated.get(plan.chair) ?? 0,
    };
  });
}

/** The shop's profit on a chair: rent + revenue share − allocated expenses. */
export function shopProfit(r: ChairRental): number {
  const share = Math.round(r.serviceRevenueCents * (r.revenueSharePct / 100));
  return r.paidCents + share - r.expenseCents;
}

export function rentCollection(rentals: ChairRental[]) {
  const active = rentals.filter((r) => r.occupied && r.periodRentCents > 0);
  const expected = active.reduce((s, r) => s + r.periodRentCents, 0);
  const collected = active.reduce((s, r) => s + r.paidCents, 0);
  return {
    expected,
    collected,
    outstanding: expected - collected,
    rate: expected ? (collected / expected) * 100 : 0,
    paid: active.filter((r) => r.status === "Paid"),
    partial: active.filter((r) => r.status === "Partial"),
    overdue: active.filter((r) => r.status === "Overdue"),
    upcoming: active.filter((r) => r.status === "Upcoming"),
  };
}

/**
 * Shop-level totals. Chair rent is its own income line and is never mixed into
 * service revenue — a renter's service income is theirs, not the shop's.
 */
export function coreFinancials(state: DemoState) {
  const ledger = serviceLedger(state);
  // Only chairs the shop operates contribute service revenue. A renter's
  // service income is theirs — the shop's cut is rent plus any revenue share.
  const shopChairs = new Set(SHOP_OPERATED_CHAIRS);
  const shopSales = ledger.filter((x) => shopChairs.has(x.chairId));
  const serviceRevenue = shopSales.reduce((s, x) => s + x.amountCents, 0);
  const tips = shopSales.reduce((s, x) => s + x.tipCents, 0);
  const renterServiceRevenue = ledger.reduce((s, x) => s + x.amountCents, 0) - serviceRevenue;

  const products = Math.round(serviceRevenue * 0.068);
  const other = Math.round(serviceRevenue * 0.009);
  const rentals = chairRentals(state);
  const chairRent = rentals.reduce((s, r) => s + r.paidCents, 0);
  const revenueShare = rentals.reduce((s, r) => s + Math.round(r.serviceRevenueCents * (r.revenueSharePct / 100)), 0);
  const memberships = Math.round(serviceRevenue * 0.032);

  const revenueLines = [
    { name: "Services", value: serviceRevenue },
    { name: "Chair Rentals", value: chairRent + revenueShare },
    { name: "Products", value: products },
    { name: "Memberships", value: memberships },
    { name: "Other", value: other },
  ];
  const revenue = revenueLines.reduce((s, l) => s + l.value, 0);

  const exps = expenses(state);
  const chairExpenses = exps.filter((e) => e.chairRelated).reduce((s, e) => s + e.amountCents, 0);
  const byCategory = new Map<string, number>();
  for (const e of exps) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents);

  // Payroll only covers the shop's own barbers — renters are paid by their own
  // clients, so their service revenue never hits the shop's wage bill.
  const payroll = Math.round(serviceRevenue * 0.46);
  const inventory = Math.round(products * 0.42);
  const cogs = payroll + inventory;
  // The expense fixtures are already at real shop scale, and so is the ledger,
  // so no rescaling is needed. The factor is kept at 1 so callers that show a
  // scaled figure stay correct if the fixtures ever move off that scale.
  const scale = 1;
  const operatingScaled = exps.reduce((s, e) => s + e.amountCents, 0);

  const grossProfit = revenue - cogs;
  const operatingProfit = grossProfit - operatingScaled;
  const net = operatingProfit;
  const margin = revenue ? (net / revenue) * 100 : 0;

  return {
    revenue, revenueLines, serviceRevenue, chairRent, revenueShare, renterServiceRevenue,
    products, memberships, other, tips,
    cogs, payroll, inventory,
    expenses: operatingScaled, expenseScale: scale,
    chairExpenses: Math.round(chairExpenses * scale),
    expensesByCategory: [...byCategory.entries()].map(([name, value]) => ({ name, value: Math.round(value * scale) })).sort((a, b) => b.value - a.value),
    grossProfit, operatingProfit, net, margin,
    cashIn: revenue + tips,
    cashOut: cogs + operatingScaled,
  };
}

/** Unified ledger: real sandbox sales + simulated rent, expenses and payroll. */
export function transactions(state: DemoState): Txn[] {
  const rentals = chairRentals(state);
  const core = coreFinancials(state);
  const out: Txn[] = [];

  const shopChairs = new Set(SHOP_OPERATED_CHAIRS);
  for (const s of serviceLedger(state)) {
    out.push({
      id: `tx_${s.id}`,
      dateISO: s.dateISO,
      description: `${s.serviceName} — ${s.clientName}`,
      type: "Service sale",
      category: s.category,
      barberName: s.barberName,
      chairLabel: s.chairId,
      location: MAIN_LOCATION,
      method: s.method,
      amountCents: s.amountCents + s.tipCents,
      shopIncome: shopChairs.has(s.chairId),
    });
  }

  // Retail sales at the front desk — the shop's, whoever rang them up.
  const retailItems = state.inventory.filter((i) => i.retailCents > 0);
  if (retailItems.length) {
    const target = Math.max(1, Math.round(core.products / Math.max(1, retailItems[0].retailCents)));
    for (let i = 0; i < Math.min(target, 26); i++) {
      const r = hash01(`retail:${i}`);
      const item = retailItems[Math.floor(r * retailItems.length) % retailItems.length];
      const d = addDays(new Date(), -Math.floor(r * 29));
      d.setHours(11 + Math.floor(r * 7), (i % 4) * 15, 0, 0);
      out.push({
        id: `tx_retail_${i}`,
        dateISO: iso(d),
        description: `${item.name} — retail`,
        type: "Product sale",
        category: item.category,
        barberName: null,
        chairLabel: null,
        location: MAIN_LOCATION,
        method: r > 0.6 ? "Cash" : "Card",
        amountCents: item.retailCents,
        shopIncome: true,
      });
    }
  }

  for (const r of rentals) {
    if (!r.occupied || r.paidCents <= 0) continue;
    out.push({
      id: `tx_rent_${r.chairId}`,
      dateISO: r.lastPaymentISO ?? new Date().toISOString(),
      description: `Chair rent — ${r.barberName} (${r.frequency.toLowerCase()})`,
      type: "Chair rent",
      category: "Chair Rentals",
      barberName: r.barberName,
      chairLabel: r.chairLabel,
      location: MAIN_LOCATION,
      method: r.paymentMethod.startsWith("Bank") ? "ACH" : "Card",
      amountCents: r.paidCents,
      shopIncome: true,
    });
  }

  for (const e of expenses(state)) {
    const staff = e.staffId ? state.staff.find((s) => s.id === e.staffId) : null;
    out.push({
      id: `tx_${e.id}`,
      dateISO: e.dateISO,
      description: `${e.category} — ${e.vendor}`,
      type: "Expense",
      category: e.category,
      barberName: staff?.name ?? null,
      chairLabel: e.chairId,
      location: e.location,
      method: "Card",
      amountCents: -Math.round(e.amountCents * core.expenseScale),
      shopIncome: true,
    });
  }

  const now = new Date();
  out.push({
    id: "tx_payroll_1",
    dateISO: iso(addDays(now, -6)),
    description: "Payroll — commission run",
    type: "Payroll",
    category: "Payroll",
    barberName: null, chairLabel: null, location: MAIN_LOCATION, method: "ACH",
    amountCents: -core.payroll,
      shopIncome: true,
  });
  const lastSale = out.find((t) => t.type === "Service sale");
  if (lastSale) {
    out.push({
      id: "tx_refund_1",
      dateISO: iso(addDays(now, -3)),
      description: "Refund — service redo",
      type: "Refund",
      category: "Service",
      barberName: lastSale.barberName, chairLabel: lastSale.chairLabel,
      location: MAIN_LOCATION, method: "Card",
      amountCents: -Math.round(lastSale.amountCents * 0.5),
      shopIncome: true,
    });
  }

  return out.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}
