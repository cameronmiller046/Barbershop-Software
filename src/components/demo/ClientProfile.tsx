"use client";

import { createContext, useContext, useState } from "react";
import { useDemo, serviceById } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { Modal, Avatar, Tag, Money, Btn, cx } from "@/components/demo/ui";
import { formatMoney } from "@/lib/utils";
import type { Customer } from "@/lib/demo/types";

// ── Shared client-profile popup ──────────────────────────────────────────────
// Any screen that shows a client can pop their full profile on tap. Wrap the app
// once in <ClientProfileProvider>; call openClient(id) via useClientProfile(), or
// just use <ClientButton id=…>. The same body powers the Customers page detail.

const Ctx = createContext<{ openClient: (id: string) => void } | null>(null);

export function useClientProfile() {
  return useContext(Ctx) ?? { openClient: () => {} };
}

export function ClientProfileProvider({ children }: { children: React.ReactNode }) {
  const { state } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const customer = openId ? state.customers.find((c) => c.id === openId) ?? null : null;
  return (
    <Ctx.Provider value={{ openClient: setOpenId }}>
      {children}
      {customer && (
        <Modal open onClose={() => setOpenId(null)} title="Client profile" footer={<Btn onClick={() => setOpenId(null)}>Close</Btn>}>
          <ClientProfileBody customer={customer} />
        </Modal>
      )}
    </Ctx.Provider>
  );
}

/** A client name/row that opens the profile popup on click. */
export function ClientButton({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { openClient } = useClientProfile();
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); openClient(id); }} className={cx("text-left", className)}>
      {children}
    </button>
  );
}

/** The reusable profile body: header + editable notes + recent visits (last 3, rest collapsible). */
export function ClientProfileBody({ customer, notesHint }: { customer: Customer; notesHint?: string }) {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const [notes, setNotes] = useState(customer.notes);
  const [showAll, setShowAll] = useState(false);

  const history = state.appointments
    .filter((a) => a.customerId === customer.id)
    .sort((a, b) => b.startISO.localeCompare(a.startISO));
  const shown = showAll ? history : history.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Avatar name={customer.name} size={56} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl text-cream">{customer.name}</h2>
          <p className="truncate text-sm text-cream/50">{customer.email} · {customer.phone}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customer.tags.map((t) => <Tag key={t} tone={t === "VIP" ? "gold" : t === "New" ? "green" : t === "Lapsed" ? "red" : "neutral"}>{t}</Tag>)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold text-cream"><Money cents={customer.totalSpentCents} /></div>
          <div className="text-xs text-cream/45">{customer.visits} visits</div>
        </div>
      </div>

      <div>
        <label className="label">Notes {notesHint && <span className="text-brass/70">· {notesHint}</span>}</label>
        <textarea className="input min-h-[90px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, allergies, styling notes…" />
        <div className="mt-2 flex justify-end">
          <Btn variant="gold" onClick={() => { actions.updateCustomer(customer.id, { notes }); toast("Notes saved"); }}>Save notes</Btn>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-cream/70">Recent visits</h3>
        {history.length === 0 ? (
          <p className="text-sm text-cream/40">No visits yet.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {shown.map((a) => {
                const svc = serviceById(state, a.serviceId);
                return (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-cream">{svc?.name}</div>
                      <div className="text-xs text-cream/45">{new Date(a.startISO).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-cream/80">{formatMoney(a.priceCents + a.tipCents)}</div>
                      <div className="text-xs capitalize text-cream/40">{a.status.replace("_", " ")}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {history.length > 3 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 w-full rounded-lg border border-white/8 py-2 text-xs font-medium text-cream/60 transition hover:border-brass/40 hover:text-brass"
              >
                {showAll ? "Show less" : `Show all ${history.length} visits`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
