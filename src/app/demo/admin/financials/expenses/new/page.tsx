"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Panel, Field, cx } from "@/components/demo/ui";
import { formatMoney } from "@/lib/utils";
import { chairRentals, LOCATIONS, MAIN_LOCATION } from "@/lib/demo/financials";
import { Icon, type IconName } from "@/components/home/icons";
import type { ExpenseAllocation, ExpenseApplyTo } from "@/lib/demo/types";

const CATEGORIES = [
  "Payroll", "Chair maintenance", "Equipment repairs", "Rent", "Utilities", "Cleaning",
  "Laundry", "Supplies", "Inventory", "Marketing", "Advertising", "Booking software",
  "Card processing", "Insurance", "Furniture", "Renovations", "Taxes", "Miscellaneous",
];
// Categories that belong to the rental-chair cost pool, so they flow into
// per-chair profitability rather than sitting only in shop overhead.
const CHAIR_CATEGORIES = new Set([
  "Chair maintenance", "Equipment repairs", "Utilities", "Cleaning", "Laundry",
  "Supplies", "Booking software", "Card processing", "Furniture", "Renovations",
]);

const PAYMENT_METHODS = ["Card", "Cash", "Bank transfer (ACH)", "Check", "Auto-debit"];
const GL_ACCOUNTS = ["6000 · Operating Expenses", "6100 · Facilities", "6200 · Equipment", "6300 · Marketing", "6400 · Professional Fees"];
const ALLOCATIONS: ExpenseAllocation[] = ["Equal per occupied chair", "Based on revenue", "Manual", "No allocation"];

const APPLY_TO: { id: ExpenseApplyTo; label: string; icon: IconName }[] = [
  { id: "Specific Chair", label: "Specific\nChair", icon: "gauge" },
  { id: "Specific Barber", label: "Specific\nBarber", icon: "staff" },
  { id: "All Rental Chairs", label: "All Rental\nChairs", icon: "users" },
  { id: "Entire Location", label: "Entire\nLocation", icon: "building" },
];

const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function AddExpensePage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInput());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [recurring, setRecurring] = useState(false);

  const [location, setLocation] = useState<string>(MAIN_LOCATION);
  const [applyTo, setApplyTo] = useState<ExpenseApplyTo>("All Rental Chairs");
  const [chairId, setChairId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [showChairs, setShowChairs] = useState(false);

  const [allocation, setAllocation] = useState<ExpenseAllocation>("Equal per occupied chair");
  const [glAccount, setGlAccount] = useState("");
  const [taxDeductible, setTaxDeductible] = useState<"Yes" | "No" | "">("");
  const [customerId, setCustomerId] = useState("");
  const [tagText, setTagText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const rentals = useMemo(() => chairRentals(state), [state]);
  const occupiedChairs = rentals.filter((r) => r.occupied);
  const rentalChairs = rentals.filter((r) => r.occupied && r.isRental);

  const parsed = parseFloat(amount);
  const amountCents = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;

  // Chairs this expense actually lands on, which is what the preview divides by.
  const targetChairs = applyTo === "Specific Chair" ? rentals.filter((r) => r.chairId === chairId)
    : applyTo === "Specific Barber" ? rentals.filter((r) => r.staffId === staffId)
    : applyTo === "All Rental Chairs" ? rentalChairs
    : occupiedChairs;
  const allocatable = allocation !== "No allocation" && targetChairs.length > 0;
  const perChair = allocatable ? Math.round(amountCents / targetChairs.length) : 0;

  const directTarget = applyTo === "Specific Chair" || applyTo === "Specific Barber";
  const canSave = !!title.trim() && !!category && amountCents > 0 && !!date &&
    (applyTo !== "Specific Chair" || !!chairId) && (applyTo !== "Specific Barber" || !!staffId);

  const addTag = () => {
    const t = tagText.trim();
    if (!t || tags.includes(t)) { setTagText(""); return; }
    setTags((s) => [...s, t]);
    setTagText("");
  };

  const save = () => {
    if (!canSave) return;
    const chair = applyTo === "Specific Chair" ? chairId
      : applyTo === "Specific Barber" ? rentals.find((r) => r.staffId === staffId)?.chairId ?? null
      : null;
    actions.addExpense({
      dateISO: new Date(`${date}T12:00:00`).toISOString(),
      amountCents, category, vendor: title.trim(),
      chairId: chair, staffId: staffId || null, location,
      notes: notes.trim(), recurring,
      allocation: directTarget ? "No allocation" : allocation,
      chairRelated: applyTo !== "Entire Location" || CHAIR_CATEGORIES.has(category),
      applyTo, description: description.trim(), paymentMethod, reference: reference.trim(),
      glAccount, taxDeductible, customerId: customerId || null, tags, receiptName,
    });
    toast(`${title.trim()} recorded — ${formatMoney(amountCents)}`, "success");
    router.push("/demo/admin/financials/expenses");
  };

  return (
    <>
      {/* Breadcrumb + header */}
      <nav className="mb-3 flex items-center gap-2 text-sm text-cream/45">
        <Link href="/demo/admin/financials" className="transition hover:text-cream">Financials</Link>
        <span className="text-cream/25">/</span>
        <Link href="/demo/admin/financials/expenses" className="transition hover:text-cream">Expenses</Link>
        <span className="text-cream/25">/</span>
        <span className="text-brass">Add Expense</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-cream sm:text-3xl">Add Expense</h1>
          <p className="mt-1 text-sm text-cream/50">Record a new business expense. Choose how and where this expense applies.</p>
        </div>
        <Actions />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {/* 1 — Expense details */}
          <Panel className="min-w-0">
            <SectionHead n={1}>Expense Details</SectionHead>
            <div className="space-y-4">
              <Field label="Expense Title *">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Laundry Service, Chair Repair, Shampoo Supplies" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category *">
                  <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Amount *">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-cream/50">$</span>
                    <input className="input" inputMode="decimal" value={amount} placeholder="0.00"
                      onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v); }} />
                  </div>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Expense Date *">
                  <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Description">
                  <textarea className="input resize-y" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., City Electric, Amazon, State Farm" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Payment Method">
                  <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="">Select payment method</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Reference / Receipt #">
                  <input className="input" value={reference} onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g., Invoice #1234, Check #5678" />
                </Field>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-cream">Recurring Expense</div>
                  <div className="text-xs text-cream/45">This expense repeats on a regular schedule</div>
                </div>
                <Toggle on={recurring} onChange={setRecurring} label="Recurring expense" />
              </div>
            </div>
          </Panel>

          {/* 2 — Apply to */}
          <Panel className="min-w-0">
            <SectionHead n={2} hint="(Where this expense belongs)">Apply To</SectionHead>
            <div className="space-y-4">
              <Field label="Location *">
                <select className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l === MAIN_LOCATION ? `${state.settings.name.replace(" — Flagship", "")} (${l})` : l}</option>
                  ))}
                </select>
              </Field>

              <div>
                <span className="label">Apply To *</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {APPLY_TO.map((a) => {
                    const I = Icon[a.icon];
                    const on = applyTo === a.id;
                    return (
                      <button key={a.id} type="button" onClick={() => setApplyTo(a.id)}
                        className={cx("flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-center text-[11px] leading-tight transition",
                          on ? "border-brass bg-brass/10 text-brass" : "border-white/10 text-cream/55 hover:border-white/20 hover:text-cream")}>
                        <I className="h-5 w-5" />
                        <span className="whitespace-pre-line">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {applyTo === "Specific Chair" && (
                <Field label="Chair *">
                  <select className="input" value={chairId} onChange={(e) => setChairId(e.target.value)}>
                    <option value="">Select a chair</option>
                    {rentals.map((r) => (
                      <option key={r.chairId} value={r.chairId}>{r.chairLabel} — {r.occupied ? r.barberName : "Vacant"}</option>
                    ))}
                  </select>
                </Field>
              )}

              {applyTo === "Specific Barber" && (
                <Field label="Barber *">
                  <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                    <option value="">Select a barber</option>
                    {state.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              )}

              {(applyTo === "All Rental Chairs" || applyTo === "Entire Location") && (
                <div>
                  <span className="label">Chairs ({applyTo === "All Rental Chairs" ? "All Rental" : "All Occupied"})</span>
                  <p className="mb-1.5 mt-0.5 text-[11px] text-cream/40">
                    This expense will be allocated across {applyTo === "All Rental Chairs" ? "all rental chairs" : "all occupied chairs"}.
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2">
                    <span className="text-sm text-cream/60">{targetChairs.length} chair{targetChairs.length === 1 ? "" : "s"}</span>
                    <button type="button" onClick={() => setShowChairs((s) => !s)} className="p-btn-ghost !px-3 !py-1 text-xs">
                      {showChairs ? "Hide" : "View Chairs"}
                    </button>
                  </div>
                  {showChairs && (
                    <ul className="mt-2 space-y-1 rounded-xl border border-white/8 bg-white/[0.02] p-2 text-xs">
                      {targetChairs.map((r) => (
                        <li key={r.chairId} className="flex items-center justify-between gap-2 px-1.5 py-1">
                          <span className="text-cream/70">{r.chairLabel}</span>
                          <span className="truncate text-cream/45">{r.barberName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {applyTo !== "Specific Barber" && (
                <Field label="Barber (Optional)" hint="Select a barber if this expense relates to them specifically">
                  <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                    <option value="">Select barber (optional)</option>
                    {state.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
              )}
            </div>
          </Panel>

          {/* 3 — Allocation */}
          <Panel className="min-w-0">
            <SectionHead n={3}>Expense Allocation</SectionHead>
            <p className="mb-3 text-xs leading-relaxed text-cream/45">
              Choose how this expense should be allocated across chairs.
            </p>
            <div className="space-y-4">
              <Field label="Allocation Method *">
                <select className="input" value={allocation} disabled={directTarget}
                  onChange={(e) => setAllocation(e.target.value as ExpenseAllocation)}>
                  {ALLOCATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>

              {directTarget ? (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 text-xs leading-relaxed text-cream/55">
                  This expense is charged directly to {applyTo === "Specific Chair"
                    ? rentals.find((r) => r.chairId === chairId)?.chairLabel ?? "the selected chair"
                    : state.staff.find((s) => s.id === staffId)?.name ?? "the selected barber"}, so there&apos;s nothing to split.
                </div>
              ) : (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/35">Allocation Preview</div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="text-cream/70">{formatMoney(amountCents)} total expense</div>
                    <div className="flex items-center gap-1.5 text-cream/50">
                      <span className="text-brass">÷</span> {targetChairs.length} chair{targetChairs.length === 1 ? "" : "s"}
                    </div>
                    <div className="pt-1">
                      <span className="text-base font-semibold text-emerald-300">{formatMoney(perChair)}</span>
                      <span className="ml-1.5 text-cream/45">allocated per chair</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-brass/25 bg-brass/[0.06] px-3.5 py-2.5 text-[11px] leading-relaxed text-brass/90">
                <Icon.shield className="mt-px h-4 w-4 shrink-0" />
                <span>
                  {allocation === "No allocation" || directTarget
                    ? "This cost stays as shop overhead and won't be split across chairs."
                    : "This allocation will be applied to each occupied chair and included in chair profitability calculations."}
                </span>
              </div>
            </div>
          </Panel>

          {/* 4 — Additional details */}
          <Panel className="min-w-0">
            <SectionHead n={4}>Additional Details</SectionHead>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="GL Account (Optional)">
                  <select className="input" value={glAccount} onChange={(e) => setGlAccount(e.target.value)}>
                    <option value="">Select GL account</option>
                    {GL_ACCOUNTS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Tax Deductible">
                  <select className="input" value={taxDeductible} onChange={(e) => setTaxDeductible(e.target.value as "Yes" | "No" | "")}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer (Optional)">
                  <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">Select customer (optional)</option>
                    {state.customers.slice(0, 40).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Tags / Labels" hint="Add custom tags to organize this expense">
                  <input className="input" value={tagText} placeholder="Type to add tags..."
                    onChange={(e) => setTagText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                    onBlur={addTag} />
                </Field>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button key={t} type="button" onClick={() => setTags((s) => s.filter((x) => x !== t))}
                      className="rounded-full border border-brass/40 bg-brass/10 px-2.5 py-1 text-[11px] text-brass transition hover:bg-brass/20">
                      {t} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {/* 5 — Receipt */}
          <Panel className="min-w-0">
            <SectionHead n={5}>Receipt / Attachment</SectionHead>
            <label className="grid cursor-pointer place-items-center rounded-xl border border-dashed border-white/15 px-4 py-8 text-center transition hover:border-brass/40">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-cream/50">
                <Icon.reports className="h-6 w-6" />
              </span>
              <span className="text-sm text-cream/70">Drag &amp; drop receipt here</span>
              <span className="my-2 text-xs text-cream/35">or</span>
              <span className="p-btn-gold !px-4 !py-1.5 text-xs">Choose File</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? null)} />
              <span className="mt-3 text-[11px] text-cream/35">Accepted formats: JPG, PNG, PDF (Max 10MB)</span>
            </label>
            {receiptName && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs">
                <span className="truncate text-cream/70">{receiptName}</span>
                <button type="button" onClick={() => setReceiptName(null)} className="shrink-0 text-cream/40 hover:text-brass">Remove</button>
              </div>
            )}
          </Panel>

          {/* 6 — Notes */}
          <Panel className="min-w-0">
            <SectionHead n={6}>Notes</SectionHead>
            <Field label="Internal Notes">
              <textarea className="input resize-y" rows={7} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes about this expense..." />
            </Field>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-[11px] text-cream/45">
              <Icon.shield className="mt-px h-4 w-4 shrink-0" />
              <span>This note is only visible to you and your team.</span>
            </div>
          </Panel>
        </div>

        {/* Summary rail */}
        <div className="min-w-0 space-y-4">
          <Panel>
            <h2 className="mb-3 text-sm font-semibold text-cream">Expense Summary</h2>
            <dl className="divide-y divide-white/5 text-sm">
              <SumRow label="Expense Amount" value={formatMoney(amountCents)} strong />
              <SumRow label="Allocation Method" value={directTarget ? "Direct to target" : allocation} />
              {!directTarget && <SumRow label={applyTo === "All Rental Chairs" ? "Rental Chairs" : "Occupied Chairs"} value={String(targetChairs.length)} />}
              {!directTarget && <SumRow label="Allocated Per Chair" value={formatMoney(perChair)} strong />}
              <SumRow label="Apply To" value={applyTo} />
              <SumRow label="Location" value={location} />
              <SumRow label="Category" value={category || "—"} />
              <SumRow label="Expense Date" value={date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"} />
            </dl>
          </Panel>

          <Panel>
            <h2 className="mb-1 text-sm font-semibold text-cream">Financial Impact</h2>
            <p className="mb-3 text-xs text-cream/45">This expense will:</p>
            <ul className="space-y-2 text-[13px]">
              <Impact on>Reduce overall profit</Impact>
              <Impact on>Be included in Profit &amp; Loss</Impact>
              <Impact on={!directTarget && allocation !== "No allocation"}>
                {directTarget ? "Charge one chair directly" : allocation === "No allocation" ? "Stay as shop overhead" : "Affect chair profitability"}
              </Impact>
            </ul>
          </Panel>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brass/25 bg-brass/[0.06] px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brass/15 text-brass"><Icon.shield className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-brass">Important</div>
          <p className="text-xs leading-relaxed text-cream/60">
            All expenses are recorded in your financial ledger and cannot be deleted. You can edit the expense details anytime.
            In this sandbox nothing is saved — your entry clears on refresh.
          </p>
        </div>
      </div>

      {/* Repeated at the foot so a long form doesn't need a scroll back up. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <p className="text-xs text-cream/40">
          {canSave
            ? "Ready to save — this expense will appear at the top of the ledger."
            : "Add a title, category, amount and date to save."}
        </p>
        <Actions />
      </div>
    </>
  );

  function Actions() {
    return (
      <div className="flex items-center gap-2">
        <Link href="/demo/admin/financials/expenses" className="p-btn-ghost">Cancel</Link>
        <button onClick={save} disabled={!canSave} className="p-btn-gold disabled:cursor-not-allowed disabled:opacity-40">
          Save Expense
        </button>
      </div>
    );
  }
}

function SectionHead({ n, children, hint }: { n: number; children: React.ReactNode; hint?: string }) {
  return (
    <h2 className="mb-4 flex flex-wrap items-baseline gap-1.5 text-sm font-semibold text-brass">
      <span>{n}.</span>
      <span>{children}</span>
      {hint && <span className="text-[11px] font-normal text-cream/40">{hint}</span>}
    </h2>
  );
}

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-cream/50">{label}</dt>
      <dd className={cx("text-right", strong ? "font-semibold text-cream" : "text-cream/85")}>{value}</dd>
    </div>
  );
}

function Impact({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cx("grid h-4 w-4 shrink-0 place-items-center rounded-full", on ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-cream/30")}>
        <Icon.check className="h-3 w-3" />
      </span>
      <span className={on ? "text-cream/75" : "text-cream/40"}>{children}</span>
    </li>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-brass" : "bg-white/12")}>
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-[#17130a] transition-all", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}
