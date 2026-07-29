import Link from "next/link";
import { appUrl } from "@/lib/utils";
import { CopyButton } from "@/components/portal/CopyButton";
import type { OnboardingState } from "@/lib/onboarding";

// First-run setup checklist for a new shop. Server-rendered from real data; the
// dismiss control is a server action passed in by the dashboard.
export function OnboardingChecklist({ state, dismiss }: { state: OnboardingState; dismiss: () => Promise<void> }) {
  const pct = Math.round((state.doneCount / state.total) * 100);
  const bookingUrl = appUrl(state.bookingPath);

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-brass/25 bg-gradient-to-br from-brass/[0.10] via-white/[0.02] to-transparent p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl text-cream sm:text-2xl">Get your shop ready</h2>
          <p className="mt-0.5 text-sm text-cream/55">A few quick steps and you&apos;re open for bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-brass">{state.doneCount} of {state.total}</span>
          <form action={dismiss}>
            <button type="submit" aria-label="Dismiss setup checklist" className="grid h-8 w-8 place-items-center rounded-full text-cream/40 transition hover:bg-white/5 hover:text-cream">✕</button>
          </form>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-[#f4d585] to-[#b98a3c] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-4 space-y-1.5">
        {state.steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition hover:border-white/8 hover:bg-white/[0.02]"
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${s.done ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300" : "border-brass/40 text-brass/70"}`}>
                {s.done
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${s.done ? "text-cream/50 line-through decoration-cream/20" : "text-cream"}`}>{s.label}</span>
                {!s.done && <span className="block text-xs text-cream/45">{s.hint}</span>}
              </span>
              {!s.done && <span className="shrink-0 text-xs font-semibold text-brass opacity-0 transition group-hover:opacity-100">Set up →</span>}
            </Link>
          </li>
        ))}
      </ul>

      {/* Booking link — handy from day one */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
        <span className="text-xs uppercase tracking-wide text-cream/40">Your booking page</span>
        <a href={bookingUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-brass hover:underline">{bookingUrl.replace(/^https?:\/\//, "")}</a>
        <CopyButton text={bookingUrl} className="shrink-0 rounded-full border border-white/12 px-3 py-1 text-xs text-cream/70 transition hover:border-brass/40 hover:text-brass" />
      </div>
    </section>
  );
}
