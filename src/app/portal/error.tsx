"use client";

// Catches any render error inside the portal so a transient hiccup shows a
// friendly retry (rendered inside the portal shell) instead of a blank screen.
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-brass/30 bg-brass/[0.06] text-xl text-brass">!</div>
      <h1 className="mt-4 font-display text-xl text-cream">This page hit a snag</h1>
      <p className="mt-1 text-sm text-cream/55">Just a momentary blip loading this page — try again.</p>
      <button onClick={() => reset()} className="btn-gold mt-5">Try again</button>
    </div>
  );
}
