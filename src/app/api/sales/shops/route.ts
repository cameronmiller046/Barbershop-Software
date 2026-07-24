import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySalesKey } from "@/lib/salesApi";
import { planLimits } from "@/lib/plans";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  tenantIds: z.array(z.string()).max(2000).optional(),
  salesRepId: z.string().optional(),
});

// POST /api/sales/shops — live status of enrolled shops (for the sales reports).
export async function POST(req: Request) {
  if (!verifySalesKey(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  let where: Prisma.TenantWhereInput;
  if (parsed.data.tenantIds?.length) where = { id: { in: parsed.data.tenantIds } };
  else if (parsed.data.salesRepId) where = { salesRepId: parsed.data.salesRepId };
  else return NextResponse.json({ shops: [] });

  const shops = await prisma.tenant.findMany({
    where,
    select: { id: true, name: true, slug: true, plan: true, status: true, subscriptionStatus: true, currentPeriodEnd: true, createdAt: true },
  });

  return NextResponse.json({
    shops: shops.map((s) => ({
      ...s,
      mrrCents: s.subscriptionStatus === "ACTIVE" ? planLimits(s.plan).priceCents : 0,
    })),
  });
}
