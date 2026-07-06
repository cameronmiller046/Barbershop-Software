"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo/store";
import { useToast } from "@/components/demo/toast";
import { PageHeader, Panel, Btn, Field, SectionTitle, SandboxNote } from "@/components/demo/ui";
import { minutesToHHMM, dayName } from "@/lib/utils";

export default function SettingsPage() {
  const { state, actions } = useDemo();
  const { toast } = useToast();
  const s = state.settings;

  const [form, setForm] = useState({
    name: s.name, tagline: s.tagline, phone: s.phone, email: s.email, address: s.address,
    primaryColor: s.primaryColor, bookingBufferMin: s.bookingBufferMin, cancellationHours: s.cancellationHours,
    notifyEmail: s.notifyEmail, notifySms: s.notifySms, onlineBooking: s.onlineBooking,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const parseMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

  return (
    <>
      <PageHeader title="Store Settings" subtitle="Branding, hours, booking rules and notifications."
        actions={<Btn variant="gold" onClick={() => { actions.updateSettings(form); toast("Settings saved to sandbox"); }}>Save changes</Btn>} />

      <SandboxNote>Store settings are a read-only simulation — you can change anything, but nothing is written to a live store.</SandboxNote>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle>Shop details</SectionTitle>
          <div className="space-y-4">
            <Field label="Shop name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Tagline"><input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Email"><input className="input" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
            </div>
            <Field label="Address"><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="Brand color">
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-white/10 bg-transparent" />
                <span className="text-sm text-cream/60">{form.primaryColor}</span>
              </div>
            </Field>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle>Booking rules</SectionTitle>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Buffer (min)" hint="Gap between bookings"><input className="input" type="number" value={form.bookingBufferMin} onChange={(e) => set("bookingBufferMin", Number(e.target.value))} /></Field>
                <Field label="Cancel window (hrs)"><input className="input" type="number" value={form.cancellationHours} onChange={(e) => set("cancellationHours", Number(e.target.value))} /></Field>
              </div>
              <Toggle label="Online booking" desc="Let clients book from your website" on={form.onlineBooking} onChange={(v) => set("onlineBooking", v)} />
              <Toggle label="Email notifications" desc="Confirmations & reminders by email" on={form.notifyEmail} onChange={(v) => set("notifyEmail", v)} />
              <Toggle label="SMS notifications" desc="Text reminders (no real messages sent)" on={form.notifySms} onChange={(v) => set("notifySms", v)} />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Hours</SectionTitle>
            <div className="space-y-2">
              {s.hours.map((h, d) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-cream/70">{dayName(d).slice(0, 3)}</span>
                  {h.open == null ? (
                    <span className="text-sm text-cream/35">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="time" defaultValue={minutesToHHMM(h.open)} onChange={(e) => actions.setDayHours("settings", d, { open: parseMin(e.target.value), close: h.close })} className="rounded-lg border border-white/10 bg-smoke px-2 py-1 text-sm text-cream" />
                      <span className="text-cream/40">–</span>
                      <input type="time" defaultValue={minutesToHHMM(h.close ?? 0)} onChange={(e) => actions.setDayHours("settings", d, { open: h.open, close: parseMin(e.target.value) })} className="rounded-lg border border-white/10 bg-smoke px-2 py-1 text-sm text-cream" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left">
      <span><span className="block text-sm text-cream">{label}</span><span className="block text-xs text-cream/45">{desc}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brass" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
