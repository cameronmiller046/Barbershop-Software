"use client";

import { useState } from "react";

export function BetaForm() {
  const [form, setForm] = useState({ businessName: "", ownerName: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="lux-card p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-2xl text-[#17130a]">✓</span>
        <h2 className="mt-4 font-display text-2xl text-cream">Application received</h2>
        <p className="mt-2 text-cream/65">
          Thanks! We&apos;ll review your shop by hand and email you once it&apos;s approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="lux-card space-y-4 p-6 sm:p-7">
      <Field label="Business name" required>
        <input className={INPUT} required value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input className={INPUT} required value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={INPUT} value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>
      <Field label="Email" required>
        <input className={INPUT} type="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Anything we should know? (optional)">
        <textarea className={`${INPUT} min-h-[100px]`} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </Field>
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      <button disabled={status === "loading"} className="btn-gold w-full disabled:opacity-50">
        {status === "loading" ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}

const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 transition focus:border-brass/60 focus:outline-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream/45">
        {label}{required && <span className="text-brass"> *</span>}
      </span>
      {children}
    </label>
  );
}
