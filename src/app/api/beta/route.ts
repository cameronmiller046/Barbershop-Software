import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";

const schema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
});

// POST /api/beta — a business requests closed-beta access.
export async function POST(req: Request) {
  const rl = rateLimit(`beta:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }
  const { businessName, ownerName, email, phone, message } = parsed.data;

  const application = await prisma.betaApplication.create({
    data: {
      businessName,
      ownerName,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      message: message || null,
    },
  });

  await audit({ action: "beta.applied", target: application.id, meta: { businessName, email } });

  await sendEmail({
    to: email,
    subject: "We received your beta request",
    html: emailLayout("Thanks for your interest", `
      <p>Hi ${escapeHtml(ownerName)}, we got your request for <b>${escapeHtml(businessName)}</b>.</p>
      <p>Our team reviews applications manually during the closed beta. We&apos;ll be
      in touch at this address once your shop is approved.</p>
    `),
  });

  return NextResponse.json({ ok: true });
}
