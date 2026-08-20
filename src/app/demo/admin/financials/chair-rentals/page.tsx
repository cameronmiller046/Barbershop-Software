"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, SectionTitle, SandboxNote, Modal, Btn, Field } from "@/components/demo/ui";
import {
  StatCard, MoneyDonut, ProgressBar, StatusPill, Select, RANGES, rangeFactor,
  TableWrap, Th, Td, Drawer, DRow, DSection, topWithOther, cx, formatMoney, downloadCsv, csvMoney,
} from "@/components/demo/finance";
import { chairRentals, rentCollection, shopProfit, expenses, MAIN_LOCATION, type ChairRental, type RentFrequency } from "@/lib/demo/financials";
import { Icon } from "@/components/home/icons";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

/** Rent terms a shop can change: the per-cycle amount and how often it bills. */
type RentTerms = { rentCents: number; frequency: RentFrequency };
const cyclesPerMonth = (f: RentFrequency) => (f === "Weekly" ? 4 : 1);
const perLabel = (f: RentFrequency) => (f === "Weekly" ? "week" : "month");

export default function ChairRentalsPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [rangeId, setRangeId] = useState("month");
  const [location, setLocation] = useState("all");
  const [openChair, setOpenChair] = useState<string | null>(null);
  // Rent recorded during this sandbox session, layered on top of the derived
  // figures so "Record Payment" visibly moves the collection numbers.
  const [extraPaid, setExtraPaid] = useState<Record<string, number>>({});
  // Rent terms changed during this session (amount and/or billing interval).
  const [rentOverride, setRentOverride] = useState<Record<string, RentTerms>>({});
  const [editingRent, setEditingRent] = useState<string | null>(null);
  const [historyChair, setHistoryChair] = useState<string | null>(null);

  const factor = rangeFactor(rangeId);
  const $ = (cents: number) => formatMoney(Math.round(cents * factor));

  const rentals = useMemo(() => {
    const base = chairRentals(state);
    return base.map((r) => {
      const override = rentOverride[r.chairId];
      const extra = extraPaid[r.chairId] ?? 0;
      if (!override && !extra) return r;

      // New terms rescale the period total; what's already been paid stands, so
      // the status is re-derived against the new amount.
      const rentCents = override?.rentCents ?? r.rentCents;
      const frequency = override?.frequency ?? r.frequency;
      const periodRentCents = r.occupied ? rentCents * cyclesPerMonth(frequency) : 0;
      const paidCents = Math.min(periodRentCents, r.paidCents + extra);
      const status = periodRentCents === 0
        ? r.status
        : paidCents >= periodRentCents ? "Paid" as const
        : paidCents > 0 ? "Partial" as const
        : r.status === "Paid" ? "Overdue" as const : r.status;

      return {
        ...r, rentCents, frequency, periodRentCents, paidCents, status,
        // Switching interval moves the next bill, so re-date it.
        nextPaymentISO: override?.frequency && override.frequency !== r.frequency
          ? new Date(Date.now() + (frequency === "Weekly" ? 7 : 30) * 86_400_000).toISOString()
          : r.nextPaymentISO,
        lastPaymentISO: extra ? new Date().toISOString() : r.lastPaymentISO,
      };
    });
  }, [state, extraPaid, rentOverride]);

  const collection = useMemo(() => rentCollection(rentals), [rentals]);
  const occupied = rentals.filter((r) => r.occupied);
  // The rental tables cover let chairs only; the shop's own chairs (owner and
  // manager) pay no rent and their service revenue is already shop revenue.
  const renters = rentals.filter((r) => r.occupied && r.isRental);
  const vacant = rentals.filter((r) => !r.occupied);
  const chairExpenseTotal = rentals.reduce((s, r) => s + r.expenseCents, 0);
  const revenueShare = rentals.reduce((s, r) => s + Math.round(r.serviceRevenueCents * (r.revenueSharePct / 100)), 0);
  const netChairProfit = collection.collected + revenueShare - chairExpenseTotal;
  const occupancyPct = (occupied.length / rentals.length) * 100;

  const selected = rentals.find((r) => r.chairId === openChair) ?? null;

  const recordPayment = (r: ChairRental) => {
    const owed = r.periodRentCents - r.paidCents;
    if (owed <= 0) { toast(`${r.barberName}'s rent is already paid in full`, "info"); return; }
    setExtraPaid((s) => ({ ...s, [r.chairId]: (s[r.chairId] ?? 0) + owed }));
    toast(`Recorded ${formatMoney(owed)} from ${r.barberName}`, "success");
  };

  function exportReport() {
    downloadCsv("chair-rentals.csv", [
      ["Chair Rentals", state.settings.name.replace(" — Flagship", "")],
      [],
      ["Rent Collection"],
      ["Expected", csvMoney(collection.expected)], ["Collected", csvMoney(collection.collected)],
      ["Outstanding", csvMoney(collection.outstanding)], ["Collection Rate %", collection.rate.toFixed(1)],
      [],
      ["Barber", "Chair", "Frequency", "Rent/Cycle", "Billed/Month", "Paid", "Status",
        "Service Revenue", "Clients", "Avg Ticket", "Chair Expenses", "Shop Profit"],
      ...renters.map((r) => [
        r.barberName, r.chairLabel, r.frequency, csvMoney(r.rentCents), csvMoney(r.periodRentCents),
        csvMoney(r.paidCents), r.status, csvMoney(r.serviceRevenueCents), r.clients,
        csvMoney(r.avgTicketCents), csvMoney(r.expenseCents), csvMoney(shopProfit(r)),
      ]),
      [],
      ["Vacant Chairs"],
      ...vacant.map((r) => [r.chairLabel, "Vacant"]),
    ]);
    toast("Chair rental report downloaded as CSV", "success");
  }

  return (
    <>
      <PageHeader
        title="Chair Rentals"
        subtitle="Track rent collection, chair profitability, occupancy, and renter performance."
        actions={
          <>
            <Select value={rangeId} onChange={setRangeId} options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
            {/* Chairs only exist at Main St. — offering other locations here
                would just filter everything to empty. */}
            <Select value={location} onChange={setLocation}
              options={[{ id: "all", label: "All Locations" }, { id: MAIN_LOCATION, label: MAIN_LOCATION }]} />
            <button onClick={exportReport} className="p-btn-gold">
              <Icon.reports className="h-4 w-4" /> Export Report
            </button>
          </>
        }
      />
      <SandboxNote>Preview of a planned feature — figures are simulated sample data. Chair rentals aren&apos;t in the live product yet.</SandboxNote>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Rental Revenue" value={$(collection.collected)} icon="dollar" delta={11.2} />
        <StatCard label="Outstanding Rent" value={$(collection.outstanding)} icon="payments" delta={-8.4} invert />
        <StatCard label="Chair Expenses" value={$(chairExpenseTotal)} icon="inventory" delta={4.1} invert />
        <StatCard label="Net Chair Profit" value={$(netChairProfit)} icon="growth" delta={13.6} />
        <StatCard
          label="Occupied Chairs"
          value={`${occupied.length} / ${rentals.length}`}
          icon="staff"
          sub={`${occupancyPct.toFixed(0)}% occupancy`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Rent collection */}
          <Panel>
            <SectionTitle right={<span className="text-xs text-cream/45">{collection.rate.toFixed(1)}% collected</span>}>
              Rent Collection
            </SectionTitle>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Expected Rent", value: collection.expected, tone: "text-cream" },
                { label: "Collected", value: collection.collected, tone: "text-emerald-300" },
                { label: "Outstanding", value: collection.outstanding, tone: "text-red-300" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[11px] text-cream/45">{s.label}</div>
                  <div className={cx("mt-0.5 text-lg font-semibold", s.tone)}>{$(s.value)}</div>
                </div>
              ))}
              <div>
                <div className="text-[11px] text-cream/45">Collection Rate</div>
                <div className="mt-0.5 text-lg font-semibold text-brass">{collection.rate.toFixed(1)}%</div>
              </div>
            </div>
            <div className="mt-3"><ProgressBar pct={collection.rate} /></div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ["Paid", collection.paid, "Paid"],
                ["Partial", collection.partial, "Partial"],
                ["Overdue", collection.overdue, "Overdue"],
                ["Upcoming", collection.upcoming, "Upcoming"],
              ] as const).map(([label, list, tone]) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <StatusPill status={tone} />
                    <span className="text-sm font-semibold text-cream">{list.length}</span>
                  </div>
                  <div className="mt-1.5 truncate text-[11px] text-cream/45">
                    {list.length ? list.map((r) => r.barberName.split(" ")[0]).join(", ") : "None"}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Performance table */}
          <Panel>
            <SectionTitle right={<span className="text-xs text-cream/40">Click a row for details</span>}>
              Chair Rental Performance
            </SectionTitle>
            <TableWrap min={940}>
              <thead>
                <tr>
                  <Th>Barber</Th><Th>Chair</Th><Th right>Rent</Th><Th right>Paid</Th><Th>Status</Th>
                  <Th right>Service Revenue</Th><Th right>Clients</Th><Th right>Avg Ticket</Th>
                  <Th right>Chair Expenses</Th><Th right>Shop Profit</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {renters.map((r) => {
                  const profit = shopProfit(r);
                  return (
                    <tr key={r.chairId} onClick={() => setOpenChair(r.chairId)}
                      className="cursor-pointer transition hover:bg-white/[0.03]">
                      <Td className="text-cream/90">{r.barberName}</Td>
                      <Td className="text-cream/60">{r.chairLabel}</Td>
                      <Td right><span className="text-cream/85">{$(r.periodRentCents)}</span></Td>
                      <Td right><span className="text-cream/85">{$(r.paidCents)}</span></Td>
                      <Td><StatusPill status={r.status} /></Td>
                      <Td right><span className="text-cream/85">{$(r.serviceRevenueCents)}</span></Td>
                      <Td right><span className="text-cream/60">{r.clients}</span></Td>
                      <Td right><span className="text-cream/60">{$(r.avgTicketCents)}</span></Td>
                      <Td right><span className="text-red-300/80">{$(r.expenseCents)}</span></Td>
                      <Td right>
                        <span className={cx("font-semibold", profit >= 0 ? "text-emerald-300" : "text-red-300")}>
                          {profit < 0 ? "-" : ""}{formatMoney(Math.abs(Math.round(profit * factor)))}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
            <p className="mt-3 text-[11px] leading-relaxed text-cream/40">
              Service revenue belongs to the renter, not the shop. Shop profit counts rent collected plus any agreed
              revenue share, less that chair&apos;s allocated expenses.
            </p>
          </Panel>

          {/* Chair profitability */}
          <Panel>
            <SectionTitle>Chair Profitability</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {renters.map((r) => {
                const share = Math.round(r.serviceRevenueCents * (r.revenueSharePct / 100));
                const profit = shopProfit(r);
                const income = r.paidCents + share;
                const margin = income ? (profit / income) * 100 : 0;
                return (
                  <div key={r.chairId} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-cream">{r.chairLabel}</span>
                      <span className="truncate text-xs text-cream/45">{r.barberName}</span>
                    </div>
                    <dl className="mt-2.5 space-y-1 text-xs">
                      <Line label="Rent collected" value={$(r.paidCents)} />
                      <Line label="Revenue share" value={$(share)} />
                      <Line label="Allocated expenses" value={`-${$(r.expenseCents)}`} negative />
                    </dl>
                    <div className="mt-2.5 flex items-baseline justify-between border-t border-white/8 pt-2.5">
                      <span className="text-xs font-semibold text-cream/70">Net Profit</span>
                      <span className={cx("text-sm font-semibold", profit >= 0 ? "text-brass" : "text-red-300")}>
                        {profit < 0 ? "-" : ""}{formatMoney(Math.abs(Math.round(profit * factor)))}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1"><ProgressBar pct={Math.max(0, margin)} tone={profit >= 0 ? "gold" : "red"} /></div>
                      <span className="text-[11px] text-cream/45">{margin.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Occupancy */}
          <Panel>
            <SectionTitle right={<span className="text-xs text-cream/45">{occupied.length} of {rentals.length} filled</span>}>
              Occupancy
            </SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {rentals.map((r) => (
                <button key={r.chairId} onClick={() => setEditingRent(r.chairId)}
                  title={`Set rent for ${r.chairLabel}`}
                  className={cx(
                    "rounded-xl border p-3 text-left transition",
                    r.occupied ? "border-white/8 bg-white/[0.02] hover:border-brass/30" : "border-dashed border-white/12 bg-transparent hover:border-brass/30",
                  )}>
                  <div className="text-sm font-semibold text-cream">{r.chairLabel}</div>
                  <div className="mt-1 truncate text-xs text-cream/55">{r.occupied ? r.barberName : "Vacant"}</div>
                  <div className="mt-2"><StatusPill status={r.occupied ? "Occupied" : "Vacant"} /></div>
                  <div className={cx("mt-2 text-[11px]", r.occupied ? "text-cream/60" : "text-red-300/80")}>
                    {r.occupied
                      ? r.rentCents > 0 ? `${formatMoney(r.rentCents)}/${r.frequency === "Weekly" ? "week" : "month"}` : "Shop chair — no rent"
                      : `Est. lost rent: ${formatMoney(CHAIR_VACANT_RENT[r.chairId] ?? 25000)}/${r.frequency === "Weekly" ? "week" : "month"}`}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-cream/40">Click a chair to change its rent.</p>
            {vacant.length > 0 && (
              <p className="mt-1 text-[11px] text-cream/40">
                {vacant.length} vacant chair{vacant.length === 1 ? "" : "s"} — roughly{" "}
                <span className="text-red-300/80">{formatMoney(vacant.reduce((s, r) => s + (CHAIR_VACANT_RENT[r.chairId] ?? 25000) * (r.frequency === "Weekly" ? 4 : 1), 0))}</span>{" "}
                of monthly rent left on the table.
              </p>
            )}
          </Panel>

          {/* Renter performance */}
          <Panel>
            <SectionTitle>Renter Performance</SectionTitle>
            <TableWrap min={880}>
              <thead>
                <tr>
                  <Th>Barber</Th><Th right>Service Revenue</Th><Th right>Appts</Th><Th right>Clients</Th>
                  <Th right>Avg Ticket</Th><Th right>Rev / Hour</Th><Th right>Tips</Th>
                  <Th right>Rebook</Th><Th right>New</Th><Th right>No-Show</Th><Th right>Retail</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {renters.map((r) => (
                  <tr key={r.chairId} onClick={() => setOpenChair(r.chairId)} className="cursor-pointer transition hover:bg-white/[0.03]">
                    <Td className="text-cream/90">{r.barberName}</Td>
                    <Td right><span className="text-cream/85">{$(r.serviceRevenueCents)}</span></Td>
                    <Td right><span className="text-cream/60">{r.appointments}</span></Td>
                    <Td right><span className="text-cream/60">{r.clients}</span></Td>
                    <Td right><span className="text-cream/60">{$(r.avgTicketCents)}</span></Td>
                    <Td right><span className="text-cream/60">{formatMoney(r.revenuePerHourCents)}</span></Td>
                    <Td right><span className="text-cream/60">{$(r.tipsCents)}</span></Td>
                    <Td right><span className="text-cream/60">{(r.rebookRate * 100).toFixed(0)}%</span></Td>
                    <Td right><span className="text-cream/60">{r.newClients}</span></Td>
                    <Td right><span className="text-cream/60">{(r.noShowRate * 100).toFixed(1)}%</span></Td>
                    <Td right><span className="text-cream/60">{$(r.retailCents)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Panel>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-4">
          <Panel>
            <SectionTitle>Chair Expense Mix</SectionTitle>
            <ChairExpenseDonut factor={factor} />
            <p className="mt-4 text-[11px] leading-relaxed text-cream/40">
              Shared costs are split across occupied chairs — equally, or weighted by each chair&apos;s service revenue —
              and flow into that chair&apos;s profitability.
            </p>
          </Panel>

          <Panel>
            <SectionTitle right={<span className="text-xs text-cream/40">This period</span>}>Upcoming Rent</SectionTitle>
            <ul className="divide-y divide-white/5">
              {renters.filter((r) => r.periodRentCents > 0).slice(0, 6).map((r) => (
                <li key={r.chairId} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-cream/60">
                    <Icon.calendar className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cream/85">{r.barberName}</span>
                    <span className="block text-[11px] text-cream/40">Due {fmtDate(r.nextPaymentISO)} · {r.frequency}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-brass">{formatMoney(r.rentCents)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {historyChair && (
        <PaymentHistory
          chair={rentals.find((r) => r.chairId === historyChair)!}
          onClose={() => setHistoryChair(null)}
        />
      )}

      {editingRent && (
        <RentEditor
          chair={rentals.find((r) => r.chairId === editingRent)!}
          onClose={() => setEditingRent(null)}
          onSave={(terms) => {
            const r = rentals.find((x) => x.chairId === editingRent)!;
            setRentOverride((s) => ({ ...s, [r.chairId]: terms }));
            setEditingRent(null);
            toast(`${r.chairLabel} rent set to ${formatMoney(terms.rentCents)}/${perLabel(terms.frequency)}`, "success");
          }}
        />
      )}

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setOpenChair(null)}
        title={selected?.barberName ?? ""}
        subtitle={selected ? `${selected.chairLabel} · ${selected.frequency} rental` : undefined}
        footer={selected && (
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => recordPayment(selected)} className="p-btn-gold justify-center !px-2 text-xs">Record Payment</button>
            <button onClick={() => toast(`Rent reminder sent to ${selected.barberName}`, "success")} className="p-btn-ghost justify-center !px-2 text-xs">Send Reminder</button>
            <button onClick={() => setHistoryChair(selected.chairId)} className="p-btn-ghost justify-center !px-2 text-xs">View History</button>
          </div>
        )}
      >
        {selected && (
          <>
            <DSection title="Rental Agreement">
              <DRow label="Chair" value={selected.chairLabel} />
              <DRow label="Rental amount" value={formatMoney(selected.rentCents)} strong />
              <DRow label="Frequency" value={selected.frequency} />
              <DRow label="Due date" value={fmtDate(selected.dueDayISO)} />
              <DRow label="Grace period" value={`${selected.gracePeriodDays} days`} />
              <DRow label="Late fee" value={formatMoney(selected.lateFeeCents)} />
              <DRow label="Deposit" value={formatMoney(selected.depositCents)} />
              <DRow label="Revenue share" value={selected.revenueSharePct ? `${selected.revenueSharePct}% of services` : "None"} />
              <DRow label="Agreement start" value={fmtDate(selected.agreementStartISO)} />
              <DRow label="Agreement end" value={fmtDate(selected.agreementEndISO)} />
            </DSection>

            <DSection title="Payment Summary">
              <DRow label="Amount due" value={formatMoney(selected.periodRentCents)} />
              <DRow label="Amount paid" value={<span className="text-emerald-300">{formatMoney(selected.paidCents)}</span>} />
              <DRow label="Outstanding" value={
                <span className={selected.periodRentCents - selected.paidCents > 0 ? "text-red-300" : "text-cream/60"}>
                  {formatMoney(Math.max(0, selected.periodRentCents - selected.paidCents))}
                </span>
              } strong />
              <DRow label="Status" value={<StatusPill status={selected.status} />} />
              <DRow label="Last payment" value={fmtDate(selected.lastPaymentISO)} />
              <DRow label="Next payment" value={fmtDate(selected.nextPaymentISO)} />
              <DRow label="Payment method" value={selected.paymentMethod} />
            </DSection>

            <DSection title="Chair Profitability">
              <DRow label="Rent collected" value={formatMoney(selected.paidCents)} />
              <DRow label="Revenue share" value={formatMoney(Math.round(selected.serviceRevenueCents * (selected.revenueSharePct / 100)))} />
              <DRow label="Allocated expenses" value={<span className="text-red-300">-{formatMoney(selected.expenseCents)}</span>} />
              <DRow label="Net profit" value={
                <span className={shopProfit(selected) >= 0 ? "text-brass" : "text-red-300"}>
                  {shopProfit(selected) < 0 ? "-" : ""}{formatMoney(Math.abs(shopProfit(selected)))}
                </span>
              } strong />
            </DSection>

            <DSection title="Business Performance">
              <DRow label="Service revenue generated" value={formatMoney(selected.serviceRevenueCents)} />
              <DRow label="Completed appointments" value={selected.appointments} />
              <DRow label="Clients served" value={selected.clients} />
              <DRow label="Average ticket" value={formatMoney(selected.avgTicketCents)} />
              <DRow label="Revenue per hour" value={formatMoney(selected.revenuePerHourCents)} />
              <DRow label="Tips" value={formatMoney(selected.tipsCents)} />
              <DRow label="Rebooking rate" value={`${(selected.rebookRate * 100).toFixed(0)}%`} />
              <DRow label="New clients" value={selected.newClients} />
              <DRow label="Returning clients" value={selected.returningClients} />
              <DRow label="No-show rate" value={`${(selected.noShowRate * 100).toFixed(1)}%`} />
              <DRow label="Retail sales" value={formatMoney(selected.retailCents)} />
            </DSection>

            <p className="rounded-xl border border-brass/20 bg-brass/[0.06] px-3.5 py-2.5 text-[11px] leading-relaxed text-brass/85">
              {selected.barberName} generated {formatMoney(selected.serviceRevenueCents)} in services, but that income is
              theirs — the shop earns {formatMoney(selected.paidCents)} in rent
              {selected.revenueSharePct ? ` plus a ${selected.revenueSharePct}% share` : ""}, less{" "}
              {formatMoney(selected.expenseCents)} of chair costs.
            </p>
          </>
        )}
      </Drawer>
    </>
  );

  function ChairExpenseDonut({ factor }: { factor: number }) {
    const rows = expenses(state).filter((e) => e.chairRelated);
    const byCat = new Map<string, number>();
    for (const e of rows) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amountCents);
    const segments = topWithOther([...byCat.entries()].map(([name, value]) => ({ name, value: Math.round(value * factor) })), 5);
    const total = segments.reduce((s, x) => s + x.value, 0);
    return (
      <MoneyDonut
        size={140}
        segments={segments}
        center={<div><div className="text-sm font-semibold text-cream">{formatMoney(total)}</div><div className="text-[10px] text-cream/45">Chair costs</div></div>}
      />
    );
  }
}

// Asking rent for the vacant chairs — what the shop is losing while empty.
const CHAIR_VACANT_RENT: Record<string, number> = { "Chair 09": 25000, "Chair 10": 90000 };

/**
 * Past rent payments for one chair, generated deterministically from its
 * terms: one row per billing cycle back from the last payment, with the odd
 * late payment (and its late fee) so the history reads like a real ledger.
 */
function PaymentHistory({ chair, onClose }: { chair: ChairRental; onClose: () => void }) {
  const cycleDays = chair.frequency === "Weekly" ? 7 : 30;
  const anchor = chair.lastPaymentISO ? new Date(chair.lastPaymentISO) : new Date();
  const rows = Array.from({ length: 8 }, (_, i) => {
    const due = new Date(anchor.getTime() - i * cycleDays * 86_400_000);
    const seed = (chair.chairId.charCodeAt(6) * 31 + i * 17) % 10;
    const late = seed === 3 || seed === 7; // deterministic, ~2 in 8 late
    const paid = new Date(due.getTime() + (late ? (chair.gracePeriodDays + 1) : 0) * 86_400_000);
    return {
      id: i,
      dueISO: due.toISOString(),
      paidISO: paid.toISOString(),
      amount: chair.rentCents + (late ? chair.lateFeeCents : 0),
      late,
      method: seed % 2 ? "Card" : "ACH",
    };
  });
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <Modal
      open onClose={onClose} wide
      title={`${chair.barberName} — payment history`}
      footer={<Btn variant="gold" onClick={onClose}>Done</Btn>}
    >
      <p className="mb-3 text-xs text-cream/45">
        {chair.chairLabel} · {formatMoney(chair.rentCents)}/{perLabel(chair.frequency)} · last 8 cycles, most recent first
      </p>
      <TableWrap min={480}>
        <thead>
          <tr><Th>Due</Th><Th>Paid</Th><Th>Method</Th><Th>Status</Th><Th right>Amount</Th></tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="text-cream/70">{fmtDate(r.dueISO)}</Td>
              <Td className="text-cream/70">{fmtDate(r.paidISO)}</Td>
              <Td className="text-cream/60">{r.method}</Td>
              <Td>{r.late
                ? <span className="rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[11px] text-brass">Late +{formatMoney(chair.lateFeeCents)}</span>
                : <StatusPill status="Paid" />}</Td>
              <Td right><span className="font-medium text-emerald-300">{formatMoney(r.amount)}</span></Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10">
            <Td className="pt-2.5 font-semibold text-cream">Total collected</Td>
            <Td><span /></Td><Td><span /></Td><Td><span /></Td>
            <Td right><span className="pt-2.5 font-semibold text-brass">{formatMoney(total)}</span></Td>
          </tr>
        </tfoot>
      </TableWrap>
    </Modal>
  );
}

/**
 * Set a chair's rent. Two steps on purpose: changing rent re-bills the renter
 * and moves the collection figures, so the second screen spells out exactly
 * what will change before it's applied.
 */
function RentEditor({
  chair, onClose, onSave,
}: { chair: ChairRental; onClose: () => void; onSave: (terms: RentTerms) => void }) {
  const [frequency, setFrequency] = useState<RentFrequency>(chair.frequency);
  const [value, setValue] = useState((chair.rentCents / 100).toFixed(2));
  const [converted, setConverted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const per = perLabel(frequency);
  const cycles = cyclesPerMonth(frequency);
  const parsed = parseFloat(value);
  const cents = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
  const changed = cents != null && (cents !== chair.rentCents || frequency !== chair.frequency);
  const newPeriod = (cents ?? 0) * cycles;
  const delta = newPeriod - chair.periodRentCents;
  const stillOwed = Math.max(0, newPeriod - chair.paidCents);

  /**
   * Switching interval rescales the amount so the monthly cost is unchanged —
   * moving someone from $250/week to monthly means $1,000/month, not $250.
   * Changing the price is a separate edit, and the amount stays editable.
   */
  const switchFrequency = (next: RentFrequency) => {
    if (next === frequency) return;
    const current = Number.isFinite(parsed) ? parsed : 0;
    const monthly = current * cyclesPerMonth(frequency);
    setValue((monthly / cyclesPerMonth(next)).toFixed(2));
    setFrequency(next);
    setConverted(true);
  };

  return (
    <Modal
      open onClose={onClose}
      title={confirming ? "Confirm rent change" : `${chair.chairLabel} rent`}
      footer={
        confirming ? (
          <>
            <Btn onClick={() => setConfirming(false)}>Back</Btn>
            <Btn variant="gold" onClick={() => onSave({ rentCents: cents!, frequency })}>Confirm change</Btn>
          </>
        ) : (
          <>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="gold" onClick={() => setConfirming(true)} disabled={!changed}>Review change</Btn>
          </>
        )
      }
    >
      {confirming ? (
        <div className="space-y-4">
          <p className="text-sm text-cream/70">
            {chair.occupied
              ? <>This changes what <span className="text-cream">{chair.barberName}</span> is billed for {chair.chairLabel}.</>
              : <>This sets the asking rent for the vacant {chair.chairLabel}.</>}
          </p>
          <div className="divide-y divide-white/5 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-1">
            {frequency !== chair.frequency && (
              <DRow label="Billing interval" value={
                <span className="flex items-baseline gap-2">
                  <span className="text-cream/40 line-through">{chair.frequency}</span>
                  <span className="font-semibold text-brass">{frequency}</span>
                </span>
              } />
            )}
            <DRow label={`Rent per ${per}`} value={
              <span className="flex items-baseline gap-2">
                {frequency === chair.frequency && <span className="text-cream/40 line-through">{formatMoney(chair.rentCents)}</span>}
                <span className="font-semibold text-brass">{formatMoney(cents!)}</span>
              </span>
            } />
            {frequency !== chair.frequency && (
              <DRow label={`Was per ${perLabel(chair.frequency)}`} value={<span className="text-cream/50">{formatMoney(chair.rentCents)}</span>} />
            )}
            <DRow label="Billed this month" value={
              <span className="flex items-baseline gap-2">
                <span className="text-cream/40 line-through">{formatMoney(chair.periodRentCents)}</span>
                <span className="text-cream">{formatMoney(newPeriod)}</span>
              </span>
            } />
            <DRow label="Change" value={
              <span className={delta >= 0 ? "text-emerald-300" : "text-red-300"}>
                {delta >= 0 ? "+" : "-"}{formatMoney(Math.abs(delta))}/month
              </span>
            } />
            {chair.occupied && <DRow label="Already paid" value={formatMoney(chair.paidCents)} />}
            {chair.occupied && <DRow label="Still owed" value={
              <span className={stillOwed > 0 ? "text-red-300" : "text-emerald-300"}>{formatMoney(stillOwed)}</span>
            } strong />}
          </div>
          {chair.occupied && chair.paidCents > newPeriod && (
            <p className="rounded-xl border border-brass/25 bg-brass/[0.07] px-3.5 py-2.5 text-xs text-brass/90">
              {chair.barberName} has already paid {formatMoney(chair.paidCents)}, more than the new monthly total.
              The overpayment would carry forward as credit.
            </p>
          )}
          <p className="text-[11px] text-cream/40">
            Sandbox only — this changes nothing outside your demo session and resets on refresh.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brass/15 text-brass"><Icon.staff className="h-4 w-4" /></span>
            <div className="min-w-0">
              <div className="truncate text-sm text-cream">{chair.occupied ? chair.barberName : "Vacant"}</div>
              <div className="text-xs text-cream/45">{chair.chairLabel} · currently billed {chair.frequency.toLowerCase()}</div>
            </div>
          </div>

          <Field label="Billing interval">
            <div className="grid grid-cols-2 gap-2">
              {(["Weekly", "Monthly"] as RentFrequency[]).map((f) => (
                <button key={f} type="button" onClick={() => switchFrequency(f)}
                  className={cx("rounded-lg border py-2 text-sm transition",
                    frequency === f ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60 hover:text-cream")}>
                  {f}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Rent per ${per}`} hint={`Billed ${cycles}× a month — ${formatMoney(newPeriod)} per month.`}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-cream/50">$</span>
              <input
                autoFocus inputMode="decimal" className="input"
                value={value}
                onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v)) { setValue(v); setConverted(false); } }}
                placeholder="0.00"
              />
            </div>
          </Field>

          {converted && frequency !== chair.frequency && (
            <p className="text-xs text-cream/45">
              Converted from {formatMoney(chair.rentCents)}/{perLabel(chair.frequency)} to keep the monthly cost the same. Edit the amount to change the price too.
            </p>
          )}
          {!changed && cents != null && (
            <p className="text-xs text-cream/40">These are the current terms — change the amount or interval to continue.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Line({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-cream/45">{label}</dt>
      <dd className={negative ? "text-red-300/80" : "text-cream/80"}>{value}</dd>
    </div>
  );
}
