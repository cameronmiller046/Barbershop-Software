import Link from "next/link";

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Live store", href: "/t/demo-store" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Request access", href: "/beta" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/contact" },
    ],
  },
];

// Placeholder social handles — swap hrefs for the shop's real profiles.
const SOCIAL: { label: string; href: string; d: string }[] = [
  { label: "Instagram", href: "https://instagram.com", d: "M12 2.2c3.2 0 3.6 0 4.8.07 1.2.05 1.8.25 2.2.4.5.2.9.5 1.3.9.4.4.7.8.9 1.3.15.4.35 1 .4 2.2.07 1.2.07 1.6.07 4.8s0 3.6-.07 4.8c-.05 1.2-.25 1.8-.4 2.2-.2.5-.5.9-.9 1.3-.4.4-.8.7-1.3.9-.4.15-1 .35-2.2.4-1.2.07-1.6.07-4.8.07s-3.6 0-4.8-.07c-1.2-.05-1.8-.25-2.2-.4a3.5 3.5 0 0 1-1.3-.9 3.5 3.5 0 0 1-.9-1.3c-.15-.4-.35-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.8c.05-1.2.25-1.8.4-2.2.2-.5.5-.9.9-1.3.4-.4.8-.7 1.3-.9.4-.15 1-.35 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.4a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8Zm0 2.2a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4Zm6.6-.3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" },
  { label: "X", href: "https://x.com", d: "M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H2l8.1-9.3L1.7 2h6.9l4.8 6.4L18.9 2Zm-2.4 18h1.9L7.6 4H5.6l10.9 16Z" },
  { label: "Facebook", href: "https://facebook.com", d: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" },
];

export function Footer() {
  return (
    <footer className="relative z-10 mt-10 border-t border-white/10 bg-[#070608]">
      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Brand + newsletter */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 10V6a2 2 0 0 1 2-2h1M18 10V6a2 2 0 0 0-2-2h-1" /><rect x="5" y="10" width="14" height="6" rx="1.5" /><path d="M7 16v4M17 16v4M4 20h16" />
                </svg>
              </span>
              <span className="leading-none">
                <span className="block font-display text-lg text-cream">The Chair</span>
                <span className="block text-[9px] uppercase tracking-[0.22em] text-brass/70">Barbershop Software</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-cream/50">
              The all-in-one platform to run your barbershop — bookings, clients, payments, and growth.
            </p>
            <form action="/beta" className="mt-6 flex max-w-xs items-center gap-2">
              <input
                type="email" name="email" required placeholder="Get product updates"
                className="w-full rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-cream outline-none placeholder:text-cream/35 focus:border-brass/50"
              />
              <button className="btn-gold shrink-0 !px-4 !py-2.5 text-sm" type="submit">Join</button>
            </form>
            <div className="mt-6 flex gap-2.5">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-cream/60 transition hover:border-brass/40 hover:text-brass">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
                </a>
              ))}
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/40">{c.title}</div>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-cream/60 transition hover:text-brass">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-cream/40 sm:flex-row">
          <span>© {new Date().getFullYear()} The Chair Barbershop Software. All rights reserved.</span>
          <span className="flex items-center gap-1.5">Made for barbers <span className="text-brass">·</span> Built to grow</span>
        </div>
      </div>
    </footer>
  );
}
