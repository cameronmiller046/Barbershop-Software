"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDemoData } from "@/lib/demo";

/**
 * One-click portal preview from the marketing site: signs into the permanent
 * flagship demo account (test1 = Admin/Manager view, test2 = Barber view) and
 * lands in the portal. Same flow the /login "Try the demo" buttons use.
 */
export async function demoPortalLogin(formData: FormData) {
  const role = String(formData.get("role")) === "barber" ? "barber" : "admin";
  const email = role === "barber" ? "test2" : "test1";
  try { await ensureDemoData(prisma); } catch { /* best-effort */ }
  try {
    await signIn("credentials", { email, password: email, redirectTo: "/portal" });
  } catch (err) {
    if (err instanceof AuthError) redirect("/login?error=1");
    throw err; // NEXT_REDIRECT propagates the successful sign-in redirect
  }
}
