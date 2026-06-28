import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 py-10 text-sm text-cream/50">
      <div className="container-page flex flex-wrap items-center justify-between gap-4">
        <span>© {new Date().getFullYear()} The Chair — barbershop software</span>
        <div className="flex flex-wrap gap-4">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/beta">Request access</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
