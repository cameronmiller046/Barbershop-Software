"use client";

// ─────────────────────────────────────────────────────────────────────────
// Demo sandbox — in-memory store.
//
// A React context holding the entire sandbox state in component memory. There
// is NO persistence (no localStorage / sessionStorage / cookies / network), so:
//   • navigating between demo screens keeps your changes (layout stays mounted)
//   • a hard refresh, tab close, or storage clear remounts the provider →
//     seedDemoState() runs again → every change is gone and the baseline returns.
//
// Because this module never imports Prisma, auth, or any server action, the
// sandbox physically cannot read or write the production database.
// ─────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { seedDemoState } from "./fixtures";
import type {
  Appointment, ApptStatus, Availability, Campaign, Customer, DayHours, DemoRole, DemoState,
  InventoryItem, MsgTemplate, PaymentMethod, PhotoSet, SentMessage, Service, ShopSettings, Staff,
} from "./types";

type Updater = (prev: DemoState) => DemoState;

export interface DemoActions {
  reset(): void;
  newId(prefix: string): string;

  // appointments
  addAppointment(a: Omit<Appointment, "id"> & { id?: string }): string;
  moveAppointment(id: string, startISO: string, staffId?: string): void;
  setApptStatus(id: string, status: ApptStatus): void;
  updateAppointment(id: string, patch: Partial<Appointment>): void;
  checkout(id: string, tipCents: number, method: PaymentMethod): void;
  deleteAppointment(id: string): void;

  // customers
  addCustomer(c: Omit<Customer, "id"> & { id?: string }): string;
  updateCustomer(id: string, patch: Partial<Customer>): void;

  // services
  addService(s: Omit<Service, "id"> & { id?: string }): string;
  updateService(id: string, patch: Partial<Service>): void;

  // staff
  addStaff(s: Omit<Staff, "id"> & { id?: string }): string;
  updateStaff(id: string, patch: Partial<Staff>): void;

  // inventory
  addInventory(i: Omit<InventoryItem, "id"> & { id?: string }): string;
  adjustStock(id: string, delta: number): void;
  updateInventory(id: string, patch: Partial<InventoryItem>): void;

  // time clock
  clockIn(staffId: string): void;
  clockOut(entryId: string): void;

  // notifications
  markNotifRead(id: string): void;
  markAllNotifsRead(): void;

  // settings / availability
  updateSettings(patch: Partial<ShopSettings>): void;
  setDayHours(kind: "settings" | "availability", day: number, hours: DayHours): void;

  // marketing / photos
  addCampaign(c: Omit<Campaign, "id"> & { id?: string }): string;
  updateCampaign(id: string, patch: Partial<Campaign>): void;
  addPhoto(p: Omit<PhotoSet, "id"> & { id?: string }): string;

  // message templates
  addTemplate(t: Omit<MsgTemplate, "id"> & { id?: string }): string;
  updateTemplate(id: string, patch: Partial<MsgTemplate>): void;
  deleteTemplate(id: string): void;
  /** Record a "sent" message. Nothing leaves the browser — see the file header. */
  logMessage(m: Omit<SentMessage, "id" | "sentISO">): string;
}

interface DemoCtx {
  state: DemoState;
  actions: DemoActions;
}

const Ctx = createContext<DemoCtx | null>(null);

export function DemoProvider({ role, children }: { role: DemoRole; children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(() => seedDemoState(role));
  // Monotonic id counter, seeded past the fixture ids; survives navigation, resets on refresh.
  const seq = useRef(1000);
  const nextId = (prefix: string) => `${prefix}_${seq.current++}`;

  const actions = useMemo<DemoActions>(() => {
    const update = (fn: Updater) => setState(fn);
    const mapItem = <T extends { id: string }>(arr: T[], id: string, patch: Partial<T>) =>
      arr.map((x) => (x.id === id ? { ...x, ...patch } : x));

    return {
      reset: () => setState(seedDemoState(role)),
      newId: nextId,

      addAppointment: (a) => {
        const id = a.id ?? nextId("a");
        update((s) => ({ ...s, appointments: [...s.appointments, { ...a, id }] }));
        return id;
      },
      moveAppointment: (id, startISO, staffId) =>
        update((s) => ({
          ...s,
          appointments: s.appointments.map((a) => {
            if (a.id !== id) return a;
            const svc = s.services.find((v) => v.id === a.serviceId);
            const dur = svc?.durationMin ?? Math.round((new Date(a.endISO).getTime() - new Date(a.startISO).getTime()) / 60000);
            const start = new Date(startISO);
            return { ...a, startISO, endISO: new Date(start.getTime() + dur * 60000).toISOString(), staffId: staffId ?? a.staffId };
          }),
        })),
      setApptStatus: (id, status) => update((s) => ({ ...s, appointments: mapItem(s.appointments, id, { status }) })),
      updateAppointment: (id, patch) => update((s) => ({ ...s, appointments: mapItem(s.appointments, id, patch) })),
      checkout: (id, tipCents, method) =>
        update((s) => ({ ...s, appointments: mapItem(s.appointments, id, { status: "completed", tipCents, paymentMethod: method }) })),
      deleteAppointment: (id) => update((s) => ({ ...s, appointments: s.appointments.filter((a) => a.id !== id) })),

      addCustomer: (c) => {
        const id = c.id ?? nextId("c");
        update((s) => ({ ...s, customers: [{ ...c, id }, ...s.customers] }));
        return id;
      },
      updateCustomer: (id, patch) => update((s) => ({ ...s, customers: mapItem(s.customers, id, patch) })),

      addService: (sv) => {
        const id = sv.id ?? nextId("sv");
        update((s) => ({ ...s, services: [...s.services, { ...sv, id }] }));
        return id;
      },
      updateService: (id, patch) => update((s) => ({ ...s, services: mapItem(s.services, id, patch) })),

      addStaff: (st) => {
        const id = st.id ?? nextId("s");
        update((s) => ({ ...s, staff: [...s.staff, { ...st, id }] }));
        return id;
      },
      updateStaff: (id, patch) => update((s) => ({ ...s, staff: mapItem(s.staff, id, patch) })),

      addInventory: (i) => {
        const id = i.id ?? nextId("inv");
        update((s) => ({ ...s, inventory: [...s.inventory, { ...i, id }] }));
        return id;
      },
      adjustStock: (id, delta) =>
        update((s) => ({ ...s, inventory: s.inventory.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock + delta) } : x)) })),
      updateInventory: (id, patch) => update((s) => ({ ...s, inventory: mapItem(s.inventory, id, patch) })),

      clockIn: (staffId) =>
        update((s) => ({ ...s, timeEntries: [...s.timeEntries, { id: nextId("te"), staffId, clockInISO: new Date().toISOString(), clockOutISO: null, note: "" }] })),
      clockOut: (entryId) =>
        update((s) => ({ ...s, timeEntries: mapItem(s.timeEntries, entryId, { clockOutISO: new Date().toISOString() }) })),

      markNotifRead: (id) => update((s) => ({ ...s, notifications: mapItem(s.notifications, id, { read: true }) })),
      markAllNotifsRead: () => update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      updateSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      setDayHours: (kind, day, hours) =>
        update((s) => {
          if (kind === "settings") {
            const next = s.settings.hours.slice(); next[day] = hours;
            return { ...s, settings: { ...s.settings, hours: next } };
          }
          const next = s.availability.hours.slice(); next[day] = hours;
          return { ...s, availability: { ...s.availability, hours: next } as Availability };
        }),

      addCampaign: (c) => {
        const id = c.id ?? nextId("cmp");
        update((s) => ({ ...s, campaigns: [{ ...c, id }, ...s.campaigns] }));
        return id;
      },
      updateCampaign: (id, patch) => update((s) => ({ ...s, campaigns: mapItem(s.campaigns, id, patch) })),
      addPhoto: (p) => {
        const id = p.id ?? nextId("ph");
        update((s) => ({ ...s, photos: [{ ...p, id }, ...s.photos] }));
        return id;
      },

      addTemplate: (t) => {
        const id = t.id ?? nextId("tpl");
        update((s) => ({ ...s, templates: [...s.templates, { ...t, id }] }));
        return id;
      },
      updateTemplate: (id, patch) => update((s) => ({ ...s, templates: mapItem(s.templates, id, patch) })),
      deleteTemplate: (id) => update((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) })),
      logMessage: (m) => {
        const id = nextId("msg");
        update((s) => ({ ...s, sentMessages: [{ ...m, id, sentISO: new Date().toISOString() }, ...s.sentMessages] }));
        return id;
      },
    };
  }, [role]);

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemo must be used within a DemoProvider");
  return ctx;
}

// ── selectors (pure helpers over state) ────────────────────────────────────
export const staffById = (s: DemoState, id: string) => s.staff.find((x) => x.id === id);
export const serviceById = (s: DemoState, id: string) => s.services.find((x) => x.id === id);
export const customerById = (s: DemoState, id: string) => s.customers.find((x) => x.id === id);
export const openTimeEntry = (s: DemoState, staffId: string) =>
  s.timeEntries.find((t) => t.staffId === staffId && !t.clockOutISO) ?? null;
