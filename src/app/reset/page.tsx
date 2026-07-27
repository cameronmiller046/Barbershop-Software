import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPassword } from "@/lib/reset";

export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  async function submit(formData: FormData) {
    "use server";
    const t = String(formData.get("token") || "");
    const next = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");
    if (next !== confirm) redirect(`/reset?token=${encodeURIComponent(t)}&error=mismatch`);
    const res = await resetPassword(t, next);
    if (res === "weak") redirect(`/reset?token=${encodeURIComponent(t)}&error=weak`);
    if (res === "invalid") redirect(`/reset?error=invalid`);
    redirect("/login?reset=1");
  }

  const err = sp.error;

  return (
    <div className="lux relative min-h-screen">
      <div className="lux-atmosphere" aria-hidden />
      <div className="lux-grain" aria-hidden />
      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/login" className="mb-8 flex flex-col items-center gap-2 text-center">
            <span className="block font-display text-3xl tracking-tight text-cream">The Chair</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-brass/70">Set a new password</span>
          </Link>

          {(!token || err === "invalid") ? (
            <div className="glass space-y-3 rounded-2xl p-6 sm:p-7">
              <h1 className="font-display text-2xl">Link expired or invalid</h1>
              <div className="gold-hairline mt-1" />
              <p className="text-sm text-cream/70">
                This reset link is no longer valid. Request a fresh one and it&apos;ll arrive within a minute.
              </p>
              <Link href="/forgot" className="btn-gold mt-2 inline-block w-full text-center">Request a new link</Link>
            </div>
          ) : (
            <form action={submit} className="glass space-y-4 rounded-2xl p-6 sm:p-7">
              <div>
                <h1 className="font-display text-2xl">Choose a new password</h1>
                <div className="gold-hairline mt-3" />
              </div>
              {err === "weak" && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  Password must be at least 8 characters and include a letter and a number.
                </p>
              )}
              {err === "mismatch" && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  The two passwords don&apos;t match.
                </p>
              )}
              <input type="hidden" name="token" value={token} />
              <div>
                <label className="label">New password</label>
                <input name="password" type="password" autoComplete="new-password" required minLength={8} className="c-input" />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className="c-input" />
              </div>
              <button type="submit" className="btn-gold w-full">Update password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
