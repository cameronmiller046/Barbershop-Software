import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LINK_APP, LINK_CAPABILITIES, sha256Hex, verifyLink } from "@/lib/yggdrasilLink";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // needs node:crypto for hashing

// POST /api/yggdrasil/pair — TOFU pairing with the Yggdrasil management plane.
// First call (unpaired) stores the token hash; once paired, rotation requires
// the CURRENT token as a Bearer credential. Only the sha256 hash is stored.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const origin = typeof body?.origin === "string" ? body.origin.slice(0, 300) : null;
  if (token.length < 32) {
    return NextResponse.json({ error: "token must be at least 32 characters" }, { status: 400 });
  }

  try {
    const existing = await prisma.yggdrasilLink.findUnique({ where: { id: 1 }, select: { id: true } });
    if (existing) {
      // Rotation: only the holder of the current token may replace it.
      if (!(await verifyLink(req))) {
        return NextResponse.json({ error: "already-paired" }, { status: 409 });
      }
      await prisma.yggdrasilLink.update({ where: { id: 1 }, data: { tokenHash: sha256Hex(token), origin } });
    } else {
      await prisma.yggdrasilLink.create({ data: { id: 1, tokenHash: sha256Hex(token), origin } });
    }
    return NextResponse.json({ ok: true, app: LINK_APP, capabilities: LINK_CAPABILITIES });
  } catch {
    return NextResponse.json({ error: "Pairing failed" }, { status: 500 });
  }
}
