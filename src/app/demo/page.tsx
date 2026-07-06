import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try the demo · The Chair",
  robots: { index: false, follow: false },
};

export default function DemoChooser() {
  return (
    <div className="portal grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-3xl text-center">
        <span className="eyebrow">Sandbox</span>
        <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">Explore The Chair, live</h1>
        <p className="mx-auto mt-3 max-w-xl text-cream/55">
          Jump into a fully-interactive sandbox — no account, no sign-up. Everything runs in your browser and resets
          the moment you refresh. Nothing you do is saved.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/demo/admin" className="p-panel p-kpi group block p-6 text-left">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brass/15 text-brass">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
            </span>
            <h2 className="mt-4 font-display text-xl text-cream">Admin / Manager Demo</h2>
            <p className="mt-1.5 text-sm text-cream/55">The full owner experience — calendar, staff, inventory, payroll, reports, analytics, marketing & settings.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brass">Enter sandbox →</span>
          </Link>

          <Link href="/demo/barber" className="p-panel p-kpi group block p-6 text-left">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8 8l12 8M8 16 20 8" /></svg>
            </span>
            <h2 className="mt-4 font-display text-xl text-cream">Barber Demo</h2>
            <p className="mt-1.5 text-sm text-cream/55">A barber&apos;s day — today&apos;s chair, checkout, tips, commission, before/after photos, time clock & availability.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">Enter sandbox →</span>
          </Link>
        </div>

        <Link href="/" className="mt-8 inline-block text-sm text-cream/50 hover:text-cream">← Back to site</Link>
      </div>
    </div>
  );
}
