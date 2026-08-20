"use client";

import { useState } from "react";
import { useDemo, serviceById, customerById } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Money, Avatar, EmptyState, SectionTitle, cx } from "@/components/demo/ui";
import { ClientButton } from "@/components/demo/ClientProfile";
import { Icon } from "@/components/home/icons";
import { formatMoney } from "@/lib/utils";
import { todayAppts } from "@/lib/demo/metrics";
import type { PaymentMethod } from "@/lib/demo/types";

const TIP_OPTIONS = [0, 0.15, 0.18, 0.2];

export default function CheckoutPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const me = state.currentStaffId;
  const fullQueue = todayAppts(state, me).filter((a) => a.status !== "completed" && a.status !== "cancelled" && a.status !== "no_show");
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const queue = q
    ? fullQueue.filter((a) => (customerById(state, a.customerId)?.name ?? "").toLowerCase().includes(q))
    : fullQueue;
  const [selId, setSelId] = useState<string | null>(fullQueue[0]?.id ?? null);
  const sel = state.appointments.find((a) => a.id === selId) ?? null;

  const [tipPct, setTipPct] = useState(0.2);
  const [customTip, setCustomTip] = useState(false);
  const [customTipStr, setCustomTipStr] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [addRetail, setAddRetail] = useState<Record<string, number>>({});

  const svc = sel ? serviceById(state, sel.serviceId) : null;
  const cust = sel ? customerById(state, sel.customerId) : null;
  const retailItems = state.inventory.filter((i) => i.retailCents > 0);
  const retailTotal = Object.entries(addRetail).reduce((sum, [id, qty]) => {
    const it = state.inventory.find((x) => x.id === id); return sum + (it ? it.retailCents * qty : 0);
  }, 0);
  const svcCents = svc?.priceCents ?? 0;
  const customTipCents = (() => { const n = parseFloat(customTipStr); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0; })();
  const tipCents = customTip ? customTipCents : Math.round(svcCents * tipPct);
  const total = svcCents + retailTotal + tipCents;

  const take = () => {
    if (!sel) return;
    Object.entries(addRetail).forEach(([id, qty]) => qty > 0 && actions.adjustStock(id, -qty));
    actions.checkout(sel.id, tipCents, method);
    toast("Payment complete — receipt sent", "success");
    const rest = queue.filter((a) => a.id !== sel.id);
    setSelId(rest[0]?.id ?? null);
    setAddRetail({});
    setTipPct(0.2);
    setCustomTip(false);
    setCustomTipStr("");
  };

  return (
    <>
      <PageHeader title="Checkout" subtitle="Complete a service and take payment. No real charge is made." />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Panel pad={false} className="overflow-hidden">
          <div className="space-y-2.5 border-b border-white/8 px-4 py-3">
            <SectionTitle>Your queue</SectionTitle>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client…"
              className="input w-full !py-2 text-sm"
            />
          </div>
          {queue.length === 0 ? (
            <div className="p-4"><EmptyState icon="check" title={q ? "No matches" : "Chair's clear"} hint={q ? "No open ticket for that client." : "No open tickets to check out."} /></div>
          ) : (
            <ul className="divide-y divide-white/5">
              {queue.map((a) => {
                const c = customerById(state, a.customerId);
                const v = serviceById(state, a.serviceId);
                return (
                  <li key={a.id}>
                    <button onClick={() => setSelId(a.id)} className={cx("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]", selId === a.id && "bg-brass/[0.08]")}>
                      <Avatar name={c?.name ?? "?"} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-cream">{c?.name}</div>
                        <div className="truncate text-xs text-cream/45">{v?.name} · {new Date(a.startISO).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                      </div>
                      <span className="text-sm text-cream/60">{formatMoney(v?.priceCents ?? 0)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {sel && svc ? (
          <Panel>
            <div className="flex items-center gap-3 border-b border-white/8 pb-4">
              <Avatar name={cust?.name ?? "?"} size={48} />
              <div><ClientButton id={sel.customerId} className="font-display text-lg text-cream transition hover:text-brass">{cust?.name}</ClientButton><div className="text-sm text-cream/50">{svc.name} · {svc.durationMin} min</div></div>
            </div>

            <div className="py-4">
              <SectionTitle>Add retail</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2">
                {retailItems.slice(0, 6).map((i) => {
                  const qty = addRetail[i.id] ?? 0;
                  return (
                    <div key={i.id} className={cx("flex items-center justify-between rounded-lg border px-3 py-2", qty > 0 ? "border-brass/40 bg-brass/[0.06]" : "border-white/8")}>
                      <div className="min-w-0"><div className="truncate text-sm text-cream">{i.name}</div><div className="text-xs text-cream/45">{formatMoney(i.retailCents)}</div></div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setAddRetail((s) => ({ ...s, [i.id]: Math.max(0, (s[i.id] ?? 0) - 1) }))} className="grid h-6 w-6 place-items-center rounded-full border border-white/12 text-cream/60">−</button>
                        <span className="w-5 text-center text-sm text-cream">{qty}</span>
                        <button onClick={() => setAddRetail((s) => ({ ...s, [i.id]: (s[i.id] ?? 0) + 1 }))} className="grid h-6 w-6 place-items-center rounded-full border border-white/12 text-cream/60">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/8 py-4">
              <SectionTitle>Tip</SectionTitle>
              <div className="flex gap-2">
                {TIP_OPTIONS.map((p) => (
                  <button key={p} onClick={() => { setCustomTip(false); setTipPct(p); }} className={cx("flex-1 rounded-lg border py-2 text-sm", !customTip && tipPct === p ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60")}>
                    {p === 0 ? "None" : `${Math.round(p * 100)}%`}
                  </button>
                ))}
                <button onClick={() => setCustomTip(true)} className={cx("flex-1 rounded-lg border py-2 text-sm", customTip ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60")}>
                  Custom
                </button>
              </div>
              {customTip && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-sm text-cream/50">$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={customTipStr}
                    onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d{0,2}$/.test(v)) setCustomTipStr(v); }}
                    placeholder="0.00"
                    className="input w-32 !py-2 text-sm"
                  />
                  <span className="text-xs text-cream/40">Enter a tip amount</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/8 py-4">
              <SectionTitle>Payment</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {(["card", "cash", "wallet"] as PaymentMethod[]).map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={cx("flex items-center justify-center gap-2 rounded-lg border py-2 text-sm capitalize", method === m ? "border-brass bg-brass/15 text-brass" : "border-white/10 text-cream/60")}>
                    <Icon.payments className="h-4 w-4" />{m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-white/8 pt-4 text-sm">
              <Row label={svc.name} value={svcCents} />
              {retailTotal > 0 && <Row label="Retail" value={retailTotal} />}
              <Row label={customTip ? "Tip (custom)" : `Tip (${Math.round(tipPct * 100)}%)`} value={tipCents} />
              <div className="flex items-center justify-between border-t border-white/8 pt-2 text-base font-semibold">
                <span className="text-cream">Total</span><span className="text-brass"><Money cents={total} /></span>
              </div>
            </div>

            <Btn variant="gold" className="mt-4 w-full" onClick={take}><Icon.check className="h-4 w-4" /> Take {formatMoney(total)}</Btn>
          </Panel>
        ) : (
          <Panel><EmptyState icon="dollar" title="Select a ticket" hint="Pick someone from your queue to check them out." /></Panel>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between text-cream/60"><span>{label}</span><Money cents={value} className="text-cream/80" /></div>;
}
