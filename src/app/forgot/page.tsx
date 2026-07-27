import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requestPasswordReset } from "@/lib/reset";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp.sent === "1";

  async function submit(formData: FormData) {
    "use server";
    // Throttle per source IP so the form can't be used to mail-bomb a victim or
    // burn the email provider's quota. Over the limit → show the same
    // confirmation and send nothing (no enumeration, no email).
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    if (!rateLimit(`forgot:${ip}`, 5, 60_000).ok) redirect("/forgot?sent=1");
    await requestPasswordReset(String(formData.get("email") || ""));
    // Always the same outcome — never reveal whether the email is registered.
    redirect("/forgot?sent=1");
  }

  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/login" className="mb-8 flex flex-col items-center gap-2 text-center">
            <span className="block font-display text-3xl tracking-tight text-cream">The Chair</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-brass/70">Password help</span>
          </Link>

          {sent ? (
            <div className="glass space-y-3 rounded-2xl p-6 sm:p-7">
              <h1 className="font-display text-2xl">Check your email</h1>
              <div className="gold-hairline mt-1" />
              <p className="text-sm text-cream/70">
                If an account exists for that address, we've sent a link to reset your password.
                The link expires in one hour.
              </p>
              <Link href="/login" className="btn-gold mt-2 inline-block w-full text-center">Back to sign in</Link>
            </div>
          ) : (
            <form action={submit} className="glass space-y-4 rounded-2xl p-6 sm:p-7">
              <div>
                <h1 className="font-display text-2xl">Forgot your password?</h1>
                <div className="gold-hairline mt-3" />
              </div>
              <p className="text-sm text-cream/60">
                Enter your account email and we'll send you a link to set a new password.
              </p>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" autoCapitalize="none" autoComplete="email" required className="c-input" />
              </div>
              <button type="submit" className="btn-gold w-full">Send reset link</button>
              <Link href="/login" className="block text-center text-sm text-cream/50 transition hover:text-brass">
                ← Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
