import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { selfServeSignup } from "@/lib/provision";
import { planLimits, parsePlanKey } from "@/lib/plans";
import { stripeConfigured } from "@/lib/stripe";
import { limit } from "@/lib/ratelimit";
import { SignupForm } from "@/components/SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start your shop — The Chair",
  description: "Create your barbershop's booking site and staff portal in minutes. Start free or pick a plan that grows with your team.",
  alternates: { canonical: "/signup" },
  robots: { index: true, follow: true },
};

// Deterministic ember positions (server component — no randomness).
const EMBERS = [
  { l: "10%", s: 3, d: 14, delay: 0 }, { l: "24%", s: 2, d: 18, delay: 3 },
  { l: "42%", s: 3, d: 12, delay: 6 }, { l: "58%", s: 2, d: 20, delay: 1 },
  { l: "74%", s: 3, d: 15, delay: 4 }, { l: "88%", s: 2, d: 19, delay: 8 },
];

const SignupSchema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  phone: z.string().max(40).optional().or(z.literal("")),
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>;
}) {
  const sp = await searchParams;

  // Already signed in → straight to the portal. Exception: demo accounts land
  // here to create their OWN shop (signing up replaces their demo session).
  const session = await auth();
  if (session?.user) {
    const stillActive = await prisma.user.findFirst({ where: { id: session.user.id, active: true }, select: { id: true } });
    if (stillActive) redirect("/portal");
  }

  const requestedPlan = parsePlanKey(sp.plan ?? null);
  // Enterprise is contact-sales — route it to the contact page.
  if (requestedPlan && planLimits(requestedPlan).contactSales) redirect("/contact");
  const defaultPlan = requestedPlan && planLimits(requestedPlan).offeredAtSignup ? requestedPlan : "TEAM";

  async function signup(formData: FormData) {
    "use server";

    // Coarse rate limit by client IP (server actions have no Request object).
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await limit(`signup:${ip}`, 6, 60_000)).ok) {
      redirect("/signup?error=invalid");
    }

    const plan = parsePlanKey(String(formData.get("plan") ?? "")) ?? "SOLO";
    const limits = planLimits(plan);
    if (limits.contactSales) redirect("/contact");
    if (!limits.offeredAtSignup) redirect("/signup?error=invalid");

    const parsed = SignupSchema.safeParse({
      businessName: String(formData.get("businessName") ?? "").trim(),
      ownerName: String(formData.get("ownerName") ?? "").trim(),
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
      password: String(formData.get("password") ?? ""),
      phone: String(formData.get("phone") ?? "").trim(),
    });
    if (!parsed.success) redirect(`/signup?plan=${plan}&error=invalid`);
    const { businessName, ownerName, email, password, phone } = parsed.data;

    // Create the tenant + owner. Duplicate email is the expected failure here.
    let result;
    try {
      result = await selfServeSignup({
        businessName, ownerName, ownerEmail: email, password, phone: phone || null, plan,
      });
    } catch {
      redirect(`/signup?plan=${plan}&error=exists`);
    }

    // Sign the new owner in (sets the session cookie; no redirect yet so we can
    // choose where to send them next).
    try {
      await signIn("credentials", { email, password, redirect: false });
    } catch {
      // Account exists even if auto sign-in hiccups — they can log in manually.
    }

    // Free plan → live now, into the portal.
    if (!result.paid) redirect("/portal");

    // Paid plan → our on-page Payment Element checkout. If billing isn't
    // configured yet, land on the billing page which explains the next step.
    if (!stripeConfigured()) redirect("/portal/billing?setup=1");
    redirect(`/signup/pay?tenant=${result.tenant.id}`);
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
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.3em] text-brass/70">Start your shop</span>
            </span>
          </Link>

          <SignupForm action={signup} defaultPlan={defaultPlan} error={sp.error} />

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
