import Link from "next/link";
import { PoleIcon } from "@/components/BarberIcons";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/t/professional-barbershop", label: "Live demo" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/70 backdrop-blur">
      {/* barber-pole accent strip */}
      <div className="barber-stripe h-1 w-full" />
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brass text-ink">
            <PoleIcon size={18} />
          </span>
          <span className="font-display text-lg tracking-wide">The Chair</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-cream/70 md:flex">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-cream">{l.label}</Link>)}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
          <Link href="/beta" className="btn-primary">Request access</Link>

          {/* Mobile menu */}
          <details className="relative md:hidden">
            <summary className="btn-ghost cursor-pointer list-none px-3 py-2" aria-label="Menu">☰</summary>
            <div className="absolute right-0 z-50 mt-2 flex w-44 flex-col rounded-xl border border-white/10 bg-charcoal p-2 shadow-2xl">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-cream/80 hover:bg-white/5">{l.label}</Link>
              ))}
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-cream/80 hover:bg-white/5 sm:hidden">Sign in</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
