import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brass font-display font-bold text-ink">
            C
          </span>
          <span className="font-display text-lg tracking-wide">The Chair</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-cream/70 md:flex">
          <Link href="/features" className="hover:text-cream">Features</Link>
          <Link href="/pricing" className="hover:text-cream">Pricing</Link>
          <Link href="/about" className="hover:text-cream">About</Link>
          <Link href="/contact" className="hover:text-cream">Contact</Link>
          <Link href="/t/professional-barbershop" className="hover:text-cream">Live demo</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
          <Link href="/beta" className="btn-primary">Request access</Link>
        </div>
      </div>
    </header>
  );
}
