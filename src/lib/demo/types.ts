// ─────────────────────────────────────────────────────────────────────────
// Demo sandbox — entity types.
//
// These are DELIBERATELY separate from the Prisma models. The demo runs 100%
// in the browser against an in-memory store; it never imports Prisma, auth, or
// server actions, so it can't read or write the production database. Keeping
// its own shapes means the sandbox can carry demo-only concepts (inventory,
// payroll, commissions, before/after photos, marketing campaigns) that don't
// exist in the real schema yet.
// ─────────────────────────────────────────────────────────────────────────

/** The two sandbox permission levels — never real production roles. */
export type DemoRole = "demo_admin" | "demo_barber";

export type StaffLevel = "Owner" | "Manager" | "Barber";

export type ApptStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_service"
  | "completed"
  | "no_show"
  | "cancelled";

export type PaymentMethod = "card" | "cash" | "wallet";

export interface Staff {
  id: string;
  name: string;
  level: StaffLevel;
  email: string;
  phone: string;
  /** Tailwind-ish accent used for the avatar + calendar chips. */
  color: string;
  active: boolean;
  hireDateISO: string;
  /** Percent of service revenue paid to the barber (0–100). */
  commissionRate: number;
  /** Hourly base wage in cents (for payroll). */
  hourlyCents: number;
  specialties: string[];
  bio: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  priceCents: number;
  active: boolean;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  tags: string[];
  visits: number;
  lastVisitISO: string | null;
  totalSpentCents: number;
  createdAtISO: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startISO: string;
  endISO: string;
  status: ApptStatus;
  priceCents: number;
  tipCents: number;
  paymentMethod: PaymentMethod | null;
  notes: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  reorderLevel: number;
  unitCostCents: number;
  retailCents: number;
  supplier: string;
}

export interface TimeEntry {
  id: string;
  staffId: string;
  clockInISO: string;
  clockOutISO: string | null;
  note: string;
  /** Manager sign-off — payroll wants every entry approved before a run. */
  approved: boolean;
  /** Set when a manager corrects the punch; surfaces in payroll alerts. */
  edited?: boolean;
}

// ── Payroll ────────────────────────────────────────────────────────────────

export type PayFrequency = "Weekly" | "Bi-weekly" | "Semi-monthly" | "Monthly";

/** A one-off pay change for an employee inside the current period. */
export interface PayrollAdjustment {
  id: string;
  staffId: string;
  kind: "Bonus" | "Deduction" | "Reimbursement" | "Tip correction";
  label: string;
  /** Positive adds to pay; deductions are stored negative. */
  amountCents: number;
  dateISO: string;
}

/** A finalized payroll run — the Pay History tab. */
export interface PayrollRun {
  id: string;
  periodLabel: string;
  ranISO: string;
  totalCents: number;
  employees: number;
}

export interface DemoNotification {
  id: string;
  kind: "appointment" | "inventory" | "review" | "system" | "payroll";
  title: string;
  body: string;
  createdISO: string;
  read: boolean;
}

export type CampaignChannel = "Email" | "SMS" | "Social";

export interface Campaign {
  id: string;
  name: string;
  /** A campaign can go out over several channels at once (SMS + Email + a
   *  social post); each reachable client gets a message per channel. */
  channels: CampaignChannel[];
  status: "Draft" | "Scheduled" | "Sent";
  audience: string;
  recipients: number;
  openRate: number; // 0–1
  /** Sales rung up at checkout with this campaign's coupon code. */
  revenueCents: number;
  sentISO: string | null;
  /** Coupon attached to this promotion (redeemable at checkout), if any. */
  couponCode?: string | null;
}

/** A promo code a client shows at checkout. Created with a campaign (or on
 *  its own); redemptions and the revenue they ring up feed Marketing. */
export interface Coupon {
  id: string;
  code: string; // stored uppercase; matched case-insensitively
  label: string; // "15% off any service"
  kind: "percent" | "amount";
  /** Percent (1–100) for `percent`, cents for `amount`. */
  value: number;
  active: boolean;
  expiresISO: string | null;
  campaignId: string | null;
  redemptions: number;
  /** Total sale value of checkouts where this code was applied. */
  revenueCents: number;
}

export interface PhotoSet {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  createdISO: string;
  note: string;
  /** CSS gradients stand in for real before/after photos (no assets, no uploads). */
  beforeStyle: string;
  afterStyle: string;
}

export type ExpenseAllocation = "Equal per occupied chair" | "Based on revenue" | "Manual" | "No allocation";
export type ExpenseApplyTo = "Specific Chair" | "Specific Barber" | "All Rental Chairs" | "Entire Location";

/** A business expense. Seeded rows live in fixtures; ones added during a
 *  session live in `DemoState.extraExpenses` and merge into the same ledger. */
export interface Expense {
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
  // Optional detail captured by the Add Expense form.
  applyTo?: ExpenseApplyTo;
  description?: string;
  paymentMethod?: string;
  reference?: string;
  glAccount?: string;
  taxDeductible?: "Yes" | "No" | "";
  customerId?: string | null;
  tags?: string[];
  receiptName?: string | null;
}

/** Reusable shop SMS/email copy. Mirrors the real MessageTemplate model, but
 *  the sandbox keeps its own shape (see the note at the top of this file). */
export interface MsgTemplate {
  id: string;
  name: string;
  channel: "SMS" | "EMAIL";
  /** "Follow-up" | "Feedback" | "Reminder" | "Win-back" | "Promotion" | "General" */
  category: string;
  subject: string | null; // email only
  body: string;
  active: boolean;
}

/** A message "sent" from the sandbox — recorded, never actually delivered. */
export interface SentMessage {
  id: string;
  customerId: string;
  channel: "SMS" | "EMAIL";
  toAddress: string;
  subject: string | null;
  body: string;
  templateId: string | null;
  sentISO: string;
}

export interface DayHours {
  open: number | null; // minutes from midnight, null = closed
  close: number | null;
}

export interface ShopSettings {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  primaryColor: string;
  bookingBufferMin: number;
  cancellationHours: number;
  /** hours[0] = Sunday … hours[6] = Saturday */
  hours: DayHours[];
  notifyEmail: boolean;
  notifySms: boolean;
  onlineBooking: boolean;
  /** Monthly revenue target set from the Financials banner (unset = no goal). */
  revenueGoalCents?: number;

  // ── Payroll ──
  payFrequency: PayFrequency;
  /** Weekly hours after which overtime pay kicks in. */
  overtimeAfterHours: number;
  overtimeMultiplier: number; // e.g. 1.5
  /** Commission suggested when adding a new barber. */
  defaultCommissionPct: number;
  tipPayout: "Same day" | "With payroll";

  // ── Booking extras ──
  autoConfirmBookings: boolean;
  allowWalkIns: boolean;
  allowDoubleBooking: boolean;
  reminderHoursBefore: number;

  // ── Financial ──
  salesTaxPct: number;
  currency: "USD";
}

/** A barber's own weekly availability (minutes-from-midnight windows). */
export interface Availability {
  hours: DayHours[];
}

export interface DemoState {
  role: DemoRole;
  /** The staff member the sandbox is "acting as" (barber demo). */
  currentStaffId: string;
  /** Timestamp the state was seeded — anchors all relative dates. */
  seededAtISO: string;
  staff: Staff[];
  services: Service[];
  customers: Customer[];
  appointments: Appointment[];
  inventory: InventoryItem[];
  timeEntries: TimeEntry[];
  notifications: DemoNotification[];
  campaigns: Campaign[];
  photos: PhotoSet[];
  templates: MsgTemplate[];
  sentMessages: SentMessage[];
  /** Expenses added during this session, merged ahead of the seeded ledger. */
  extraExpenses: Expense[];
  coupons: Coupon[];
  payrollAdjustments: PayrollAdjustment[];
  payrollRuns: PayrollRun[];
  payrollNotes: string;
  settings: ShopSettings;
  availability: Availability;
  /** Monotonic counter for new entity ids created during the session. */
  seq: number;
}
