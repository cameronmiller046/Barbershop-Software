import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "PLATFORM_ADMIN" ? "/admin" : "/portal");
  }

  async function login(formData: FormData) {
    "use server";
    const from = (formData.get("from") as string) || "";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        // /portal & /admin layouts redirect to the right home per role
        redirectTo: from || "/portal",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ""}`);
      }
      throw err;
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center font-display text-2xl">
          The Chair <span className="text-brass">· Sign in</span>
        </Link>
        <form action={login} className="card space-y-4">
          <h1 className="font-display text-2xl">Welcome back</h1>
          {sp.error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              Invalid email or password.
            </p>
          )}
          <input type="hidden" name="from" value={sp.from ?? ""} />
          <div>
            <label className="label">Email or username</label>
            <input name="email" type="text" autoCapitalize="none" autoComplete="username" required className="input" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
          <p className="text-center text-xs text-cream/40">
            Accounts are created during onboarding.
          </p>
        </form>
        <Link href="/" className="mt-4 block text-center text-sm text-cream/50 hover:text-cream">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
