"use client";

import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, SectionTitle, SandboxNote } from "@/components/demo/ui";
import { StatCard, Select, TableWrap, Th, Td, Amount, cx, formatMoney } from "@/components/demo/finance";
import { transactions, LOCATIONS, type Txn } from "@/lib/demo/financials";
import { Icon, type IconName } from "@/components/home/icons";

const ALL = "all";
const TYPES: Txn["type"][] = ["Service sale", "Product sale", "Chair rent", "Expense", "Refund", "Payroll"];
const TYPE_ICON: Record<Txn["type"], IconName> = {
  "Service sale": "scissors", "Product sale": "inventory", "Chair rent": "staff",
  Expense: "payments", Refund: "arrow", Payroll: "dollar",
};
const PAGE_SIZE = 25;

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  const today = d.toDateString() === new Date().toDateString();
  return `${today ? "Today" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};

export default function TransactionsPage() {
  const { state } = useDemo();
  const { toast } = useToast();
  const [type, setType] = useState(ALL);
  const [location, setLocation] = useState(ALL);
  const [method, setMethod] = useState(ALL);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const all = useMemo(() => transactions(state), [state]);
  const methods = useMemo(() => [...new Set(all.map((t) => t.method))].sort(), [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((t) =>
      (type === ALL || t.type === type) &&
      (location === ALL || t.location === location) &&
      (method === ALL || t.method === method) &&
      (!needle || t.description.toLowerCase().includes(needle) || (t.barberName ?? "").toLowerCase().includes(needle)),
    );
  }, [all, type, location, method, q]);

  // Renters' service sales run through the shop's book but are not shop money,
  // so they're tallied separately from income.
  const income = rows.filter((t) => t.amountCents > 0 && t.shopIncome).reduce((s, t) => s + t.amountCents, 0);
  const outgoing = rows.filter((t) => t.amountCents < 0).reduce((s, t) => s + t.amountCents, 0);
  const renterVolume = rows.filter((t) => !t.shopIncome).reduce((s, t) => s + t.amountCents, 0);
  const netTotal = income + outgoing;

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const filtered = [type, location, method].some((v) => v !== ALL) || !!q.trim();

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="One ledger for every dollar in and out — sales, rent, expenses and refunds."
        actions={
          <button onClick={() => toast("Sample ledger exported — real exports ship with the live feature", "success")} className="p-btn-gold">
            <Icon.reports className="h-4 w-4" /> Export Report
          </button>
        }
      />
      <SandboxNote>Preview of a planned feature — figures are simulated sample data. Financials aren&apos;t in the live product yet.</SandboxNote>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Shop Income" value={formatMoney(income)} icon="growth" sub={`${rows.filter((t) => t.amountCents > 0 && t.shopIncome).length} transactions`} />
        <StatCard label="Money Out" value={formatMoney(Math.abs(outgoing))} icon="payments" sub={`${rows.filter((t) => t.amountCents < 0).length} transactions`} />
        <StatCard label="Net" value={formatMoney(netTotal)} icon="dollar" sub="Shop income less money out" />
        <StatCard label="Renter Volume" value={formatMoney(renterVolume)} icon="staff" sub="Renters' own income — not the shop's" />
      </div>

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={type} onChange={onFilter(setType)} options={[{ id: ALL, label: "All Types" }, ...TYPES.map((t) => ({ id: t, label: t }))]} />
          <Select value={location} onChange={onFilter(setLocation)} options={[{ id: ALL, label: "All Locations" }, ...LOCATIONS.map((l) => ({ id: l, label: l }))]} />
          <Select value={method} onChange={onFilter(setMethod)} options={[{ id: ALL, label: "All Methods" }, ...methods.map((m) => ({ id: m, label: m }))]} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search description or barber…"
            className="input w-full !py-1.5 text-xs sm:w-56" />
          {filtered && (
            <button onClick={() => { setType(ALL); setLocation(ALL); setMethod(ALL); setQ(""); setPage(1); }}
              className="text-xs font-semibold text-brass hover:underline">Clear</button>
          )}
          <span className="ml-auto text-xs text-cream/40">{rows.length} transaction{rows.length === 1 ? "" : "s"}</span>
        </div>
      </Panel>

      <Panel>
        <SectionTitle>Ledger</SectionTitle>
        {rows.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
            <span className="text-cream/70">No transactions match these filters</span>
          </div>
        ) : (
          <>
            <TableWrap min={940}>
              <thead>
                <tr>
                  <Th>Date</Th><Th>Description</Th><Th>Type</Th><Th>Category</Th>
                  <Th>Barber</Th><Th>Chair</Th><Th>Location</Th><Th>Method</Th><Th right>Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pageRows.map((t) => {
                  const I = Icon[TYPE_ICON[t.type]];
                  return (
                    <tr key={t.id} className="transition hover:bg-white/[0.02]">
                      <Td className="whitespace-nowrap text-cream/55">{fmtDateTime(t.dateISO)}</Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className={cx(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                            t.amountCents >= 0 ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300/80" : "border-red-400/25 bg-red-400/[0.07] text-red-300/80",
                          )}>
                            <I className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate text-cream/90">{t.description}</span>
                          {!t.shopIncome && (
                            <span className="shrink-0 rounded-full border border-white/12 px-1.5 py-0.5 text-[10px] text-cream/40" title="Renter's own income — not shop revenue">
                              Renter
                            </span>
                          )}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-cream/60">{t.type}</Td>
                      <Td className="text-cream/60">{t.category}</Td>
                      <Td className="text-cream/60">{t.barberName ?? <span className="text-cream/25">—</span>}</Td>
                      <Td className="text-cream/60">{t.chairLabel ?? <span className="text-cream/25">—</span>}</Td>
                      <Td className="text-cream/60">{t.location}</Td>
                      <Td className="text-cream/60">{t.method}</Td>
                      <Td right>
                        {t.shopIncome
                          ? <Amount cents={t.amountCents} />
                          : <span className="font-medium tabular-nums text-cream/35">{formatMoney(t.amountCents)}</span>}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                <span className="text-xs text-cream/40">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                    className="rounded-lg border border-white/10 px-3 py-1 text-xs text-cream/70 transition hover:border-brass/40 hover:text-brass disabled:opacity-30">
                    Previous
                  </button>
                  <span className="text-xs text-cream/50">{safePage} / {totalPages}</span>
                  <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                    className="rounded-lg border border-white/10 px-3 py-1 text-xs text-cream/70 transition hover:border-brass/40 hover:text-brass disabled:opacity-30">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
