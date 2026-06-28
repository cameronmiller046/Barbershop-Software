import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 text-center">
      <div>
        <div className="font-display text-6xl text-brass">404</div>
        <p className="mt-3 text-cream/70">We couldn&apos;t find that page or shop.</p>
        <Link href="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </div>
  );
}
