import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/demo";
import { AuthError } from "next-auth";
import { StoreFinder } from "@/components/StoreFinder";

export const dynamic = "force-dynamic";

function storeLabel(t: { storeNumber: number; name: string; address: string | null }) {
  const parts = (t.address || "").split(",").map((s) => s.trim()).filter(Boolean);
  let loc = "";
  if (parts.length >= 3) loc = `${parts[1]}, ${parts[2].split(" ")[0]}`; // "City, ST"
  else if (parts.length === 2) loc = parts[1];
  return `#${t.storeNumber} ${loc ? loc + " - " : ""}${t.name}`;
}

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

  const stores = (await prisma.tenant.findMany({
    where: { status: "ACTIVE", isDemo: false }, // never surface demo shops on the live login
    select: { slug: true, name: true, storeNumber: true, address: true },
    orderBy: { storeNumber: "asc" },
  })).map((t) => ({ slug: t.slug, label: storeLabel(t) }));

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
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
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
        </form>

        {/* Try the demo — log straight in as a sample account */}
        <div className="card mt-4">
          <h2 className="font-display text-lg">Try the demo</h2>
          <p className="mt-1 text-sm text-cream/50">Jump in as a sample account.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <form action={demoLogin}>
              <input type="hidden" name="email" value="test1" />
              <input type="hidden" name="password" value="test1" />
              <button type="submit" className="btn-primary w-full">Admin / Manager / Owner Demo</button>
            </form>
            <form action={demoLogin}>
              <input type="hidden" name="email" value="test2" />
              <input type="hidden" name="password" value="test2" />
              <button type="submit" className="btn-ghost w-full">Barber Demo</button>
            </form>
          </div>
        </div>

        {/* Find a store's public site */}
        {stores.length > 0 && (
          <div className="card mt-4">
            <h2 className="font-display text-lg">Find a store</h2>
            <p className="mt-1 text-sm text-cream/50">Pick your shop to visit its site.</p>
            <div className="mt-3">
              <StoreFinder stores={stores} />
            </div>
          </div>
        )}

        <Link href="/" className="mt-4 block text-center text-sm text-cream/50 hover:text-cream">
          ← Back to site
        </Link>
      </div>
    </div>
  );
}
