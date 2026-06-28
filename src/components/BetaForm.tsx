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
      <div className="card">
        <h2 className="font-display text-2xl text-brass">Application received</h2>
        <p className="mt-2 text-cream/75">
          Thanks! We&apos;ll review your shop and email you once it&apos;s approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label">Business name</label>
        <input className="input" required value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Your name</label>
          <input className="input" required value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input className="input" type="email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="label">Anything we should know? (optional)</label>
        <textarea className="input min-h-[90px]" value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </div>
      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      <button disabled={status === "loading"} className="btn-primary w-full disabled:opacity-50">
        {status === "loading" ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
