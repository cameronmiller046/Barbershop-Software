"use client";

import { useState } from "react";
import { Icon } from "@/components/home/icons";

const SUBJECTS = ["Sales", "Support", "Partnerships", "General question", "Book a demo"];

export function ContactForm() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", company: "", phone: "",
    subject: "Sales", message: "", preferred: "Email",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const name = `${form.firstName} ${form.lastName}`.trim();
    const message =
      `Subject: ${form.subject}\n` +
      (form.company ? `Company: ${form.company}\n` : "") +
      (form.phone ? `Phone: ${form.phone}\n` : "") +
      `Preferred contact: ${form.preferred}\n\n${form.message}`;
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: form.email, message }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch { setStatus("error"); }
  }

  if (status === "done") {
    return (
      <div className="p-glass rounded-3xl p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-2xl text-[#17130a]">✓</span>
        <h3 className="mt-5 font-display text-2xl text-cream">Message sent!</h3>
        <p className="mt-2 text-cream/60">Thanks for reaching out — we&apos;ll get back to you within one business day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-glass rounded-3xl p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required><input required className="c-input" value={form.firstName} onChange={set("firstName")} /></Field>
        <Field label="Last name" required><input required className="c-input" value={form.lastName} onChange={set("lastName")} /></Field>
        <Field label="Email" required><input required type="email" className="c-input" value={form.email} onChange={set("email")} /></Field>
        <Field label="Company"><input className="c-input" value={form.company} onChange={set("company")} placeholder="Optional" /></Field>
        <Field label="Phone number"><input type="tel" className="c-input" value={form.phone} onChange={set("phone")} placeholder="Optional" /></Field>
        <Field label="Subject">
          <select className="c-input" value={form.subject} onChange={set("subject")}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Message" required><textarea required rows={5} className="c-input min-h-[120px]" value={form.message} onChange={set("message")} placeholder="How can we help?" /></Field>
        </div>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream/50">Preferred contact method</span>
          <div className="flex gap-2">
            {["Email", "Phone"].map((m) => (
              <button type="button" key={m} onClick={() => setForm({ ...form, preferred: m })}
                className={`rounded-full border px-4 py-2 text-sm transition ${form.preferred === m ? "border-brass/60 bg-brass/10 text-brass" : "border-white/12 text-cream/60 hover:border-white/25"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {status === "error" && <p className="mt-4 text-sm text-red-300">Something went wrong — please try again or email us directly.</p>}

      <button disabled={status === "loading"} className="btn-gold mt-6 w-full text-base disabled:opacity-50">
        {status === "loading" ? "Sending…" : <>Send Message <Icon.arrow className="h-4 w-4" /></>}
      </button>
      <p className="mt-3 text-center text-xs text-cream/45">We typically respond within one business day.</p>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream/50">{label}{required && <span className="text-brass"> *</span>}</span>
      {children}
    </label>
  );
}
