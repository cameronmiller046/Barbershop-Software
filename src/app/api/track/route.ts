import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { isBot, recordPageView } from "@/lib/track";

export const runtime = "nodejs"; // needs node:crypto for hashing

const schema = z.object({
  path: z.string().min(1).max(200),
  ref: z.string().max(400).optional(),
  slug: z.string().max(80).optional(),
  vid: z.string().max(64).optional(), // persistent visitor id (only sent with consent)
});

// POST /api/track — anonymous, cookieless page-view beacon. Always returns 204
// and never throws to the client; analytics must never break the site.
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  if (isBot(ua)) return new NextResponse(null, { status: 204 });

  const ip = clientIp(req);
  if (!rateLimit(`track:${ip}`, 120, 60_000).ok) return new NextResponse(null, { status: 204 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const { path, ref, slug, vid } = parsed.data;

  // Only ever track public pages — never the internal portal/admin/api.
  if (/^\/(admin|portal|api|login)(\/|$)/.test(path)) return new NextResponse(null, { status: 204 });

  try {
    let tenantId: string | null = null;
    if (slug) {
      const t = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
      tenantId = t?.id ?? null;
    }
    let selfHost: string | undefined;
    try { selfHost = new URL(req.url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }

    await recordPageView({ tenantId, path, referrer: ref || "", ua, ip, selfHost, vid });
  } catch {
    // swallow — never surface analytics failures to visitors
  }
  return new NextResponse(null, { status: 204 });
}
