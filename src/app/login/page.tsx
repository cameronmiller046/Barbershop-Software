import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/demo";
import { AuthError } from "next-auth";

export const dynamic = "force-dynamic";

// Deterministic ember positions (server component — no randomness).
const EMBERS = [
  { l: "10%", s: 3, d: 14, delay: 0 }, { l: "24%", s: 2, d: 18, delay: 3 },
  { l: "42%", s: 3, d: 12, delay: 6 }, { l: "58%", s: 2, d: 20, delay: 1 },
  { l: "74%", s: 3, d: 15, delay: 4 }, { l: "88%", s: 2, d: 19, delay: 8 },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) {
    // Only bounce a session whose backing account still exists and is active.
    // A deactivated/deleted login (e.g. a removed kiosk device) keeps a valid
    // JWT; without this check it would ping-pong forever between /login and the
    // portal (which redirects it right back). Fall through to the form instead.
    const stillActive = await prisma.user.findFirst({ where: { id: session.user.id, active: true }, select: { id: true } });
    if (stillActive) redirect(session.user.role === "PLATFORM_ADMIN" ? "/admin" : "/portal");
  }

  async function login(formData: FormData) {
    "use server";
    const from = (formData.get("from") as string) || "";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: from || "/portal",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ""}`);
      }
      throw err;
    }
  }

  async function demoLogin(formData: FormData) {
    "use server";
    try { await ensureDemoData(prisma); } catch { /* best-effort */ }
    try {
      await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/portal" });
    } catch (err) {
      if (err instanceof AuthError) redirect("/login?error=1");
      throw err;
    }
  }

  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="lux-embers absolute inset-0" aria-hidden>
        {EMBERS.map((e, i) => (
          <span key={i} className="lux-ember" style={{ left: e.l, width: e.s, height: e.s, animationDuration: `${e.d}s`, animationDelay: `${e.delay}s` }} />
        ))}
      </div>

      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-md animate-fade-up">
          {/* Brand */}
          <Link href="/" className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f4d585] to-[#b98a3c] text-[#17130a] shadow-[0_12px_32px_-10px_rgba(216,178,92,0.55)]">
              <ChairMark />
            </span>
            <span className="leading-none">
              <span className="block font-display text-3xl tracking-tight text-cream">The Chair</span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.3em] text-brass/70">Member sign in</span>
            </span>
          </Link>

          <form action={login} className="glass space-y-4 rounded-2xl p-6 sm:p-7">
            <div>
              <h1 className="font-display text-2xl">Welcome back</h1>
              <div className="gold-hairline mt-3" />
            </div>
            {sp.error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Invalid email or password.
              </p>
            )}
            <input type="hidden" name="from" value={sp.from ?? ""} />
            <div>
              <label className="label">Email or username</label>
              <input name="email" type="text" autoCapitalize="none" autoComplete="username" required className="c-input" />
            </div>
            <div>
              <label className="label">Password</label>
              <input name="password" type="password" required className="c-input" />
            </div>
            <button type="submit" className="btn-gold w-full">Sign in</button>
          </form>

          {/* Try the demo — log straight in as a sample account */}
          <div className="glass mt-4 rounded-2xl p-6">
            <h2 className="font-display text-lg">Try the demo</h2>
            <p className="mt-1 text-sm text-cream/50">Jump in as a sample account.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <form action={demoLogin}>
                <input type="hidden" name="email" value="test1" />
                <input type="hidden" name="password" value="test1" />
                <button type="submit" className="p-btn-gold w-full">Admin / Manager / Owner Demo</button>
              </form>
              <form action={demoLogin}>
                <input type="hidden" name="email" value="test2" />
                <input type="hidden" name="password" value="test2" />
                <button type="submit" className="p-btn-ghost w-full">Barber Demo</button>
              </form>
            </div>
          </div>

          <Link href="/" className="mt-6 block text-center text-sm text-cream/50 transition hover:text-brass">
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChairMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10V6a2 2 0 0 1 2-2h1M18 10V6a2 2 0 0 0-2-2h-1" />
      <rect x="5" y="10" width="14" height="6" rx="1.5" />
      <path d="M7 16v4M17 16v4M4 20h16" />
    </svg>
  );
}
