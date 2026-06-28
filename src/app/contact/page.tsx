"use client";

import { useState } from "react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setStatus(res.ok ? "done" : "error");
  }

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="container-page max-w-xl py-16">
        <h1 className="font-display text-4xl">Contact us</h1>
        <p className="mt-3 text-cream/70">Questions about the platform? Send a note.</p>
        {status === "done" ? (
          <div className="card mt-8">
            <h2 className="font-display text-2xl text-brass">Thanks!</h2>
            <p className="mt-2 text-cream/75">We&apos;ll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card mt-8 space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input min-h-[120px]" required value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            {status === "error" && <p className="text-sm text-red-300">Something went wrong.</p>}
            <button disabled={status === "loading"} className="btn-primary w-full disabled:opacity-50">
              {status === "loading" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </section>
      <MarketingFooter />
    </div>
  );
}
