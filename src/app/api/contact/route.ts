import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendEmail, emailLayout } from "@/lib/email";
import { audit } from "@/lib/audit";
import { escapeHtml } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
});

// POST /api/contact — general marketing contact form.
export async function POST(req: Request) {
  const rl = rateLimit(`contact:${clientIp(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid form." }, { status: 400 });

  const { name, email, message } = parsed.data;
  await audit({ action: "contact.submitted", meta: { name, email } });

  const to = process.env.PLATFORM_ADMIN_EMAIL || email;
  await sendEmail({
    to,
    subject: `New contact from ${name}`,
    html: emailLayout("New contact message", `<p><b>${escapeHtml(name)}</b> (${escapeHtml(email)}) wrote:</p><p>${escapeHtml(message)}</p>`),
  });

  return NextResponse.json({ ok: true });
}
