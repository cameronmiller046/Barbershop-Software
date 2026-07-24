"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";

// Plan options shown on the signup form. Prices/labels mirror lib/plans.ts and
// the /pricing page. Enterprise is contact-sales (not self-serve).
const PLAN_OPTIONS = [
  { key: "SOLO", name: "Solo", price: "$0.50/mo", blurb: "1 barber · online booking · client CRM", paid: true, trial: false },
  { key: "TEAM", name: "Team", price: "$49/mo", blurb: "3 barbers · reports · loyalty · reviews", paid: true, trial: true },
  { key: "BARBERSHOP", name: "Barbershop", price: "$129/mo", blurb: "8 barbers · SMS reminders · priority support", paid: true, trial: true },
] as const;

const ERRORS: Record<string, string> = {
  invalid: "Please check the form and try again.",
  exists: "An account with that email already exists. Try signing in instead.",
  checkout: "We couldn't start checkout. Please try again or contact support.",
};

export function SignupForm({
  action,
  defaultPlan,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultPlan: string;
  error?: string;
}) {
  const [plan, setPlan] = useState(
    PLAN_OPTIONS.some((p) => p.key === defaultPlan) ? defaultPlan : "TEAM",
  );
  const selected = PLAN_OPTIONS.find((p) => p.key === plan);
  const paid = selected?.paid ?? true;
  const trial = selected?.trial ?? false;

  return (
    <form action={action} className="glass space-y-4 rounded-2xl p-6 sm:p-7">
      <div>
        <h1 className="font-display text-2xl text-cream">Create your shop</h1>
        <div className="gold-hairline mt-3" />
      </div>

      {error && ERRORS[error] && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {ERRORS[error]}
        </p>
      )}

      {/* Plan selector */}
      <fieldset className="space-y-2">
        <legend className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream/45">Choose a plan</legend>
        {PLAN_OPTIONS.map((p) => (
          <label
            key={p.key}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${
              plan === p.key ? "border-brass/60 bg-brass/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <input
              type="radio"
              name="plan"
              value={p.key}
              checked={plan === p.key}
              onChange={() => setPlan(p.key)}
              className="sr-only"
            />
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                plan === p.key ? "border-brass" : "border-cream/30"
              }`}
            >
              {plan === p.key && <span className="h-2 w-2 rounded-full bg-brass" />}
            </span>
            <span className="flex-1">
              <span className="flex items-center justify-between">
                <span className="font-semibold text-cream">{p.name}</span>
                <span className="text-sm font-semibold text-brass">{p.price}</span>
              </span>
              <span className="mt-0.5 block text-xs text-cream/50">{p.blurb}</span>
            </span>
          </label>
        ))}
        <p className="px-1 pt-1 text-xs text-cream/45">
          Need multiple locations or franchise tools?{" "}
          <Link href="/contact" className="text-brass hover:underline">Talk to sales →</Link>
        </p>
      </fieldset>

      <div className="gold-hairline" />

      <Field label="Business name" required>
        <input name="businessName" className={INPUT} required maxLength={120} placeholder="Kingsman Barbers" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input name="ownerName" className={INPUT} required maxLength={120} placeholder="Alex Rivera" />
        </Field>
        <Field label="Phone">
          <input name="phone" className={INPUT} maxLength={40} placeholder="(555) 123-4567" />
        </Field>
      </div>
      <Field label="Email" required>
        <input name="email" type="email" autoCapitalize="none" autoComplete="email" className={INPUT} required placeholder="you@shop.com" />
      </Field>
      <Field label="Password" required>
        <input name="password" type="password" autoComplete="new-password" className={INPUT} required minLength={8} placeholder="At least 8 characters" />
      </Field>

      <Submit paid={paid} />

      <p className="text-center text-xs text-cream/45">
        {paid
          ? (trial
              ? "Next, enter your card to start your subscription — 14-day free trial, no charge today."
              : "Next, enter your card to start your subscription — charged today.")
          : "No credit card required. Your shop goes live instantly."}
      </p>

      <p className="pt-1 text-center text-sm text-cream/50">
        Already have an account?{" "}
        <Link href="/login" className="text-brass hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

function Submit({ paid }: { paid: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-gold w-full disabled:opacity-50">
      {pending ? "Creating your shop…" : paid ? "Continue to checkout" : "Create my shop — free"}
    </button>
  );
}

const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-cream placeholder:text-cream/25 transition focus:border-brass/60 focus:outline-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cream/45">
        {label}
        {required && <span className="text-brass"> *</span>}
      </span>
      {children}
    </label>
  );
}
