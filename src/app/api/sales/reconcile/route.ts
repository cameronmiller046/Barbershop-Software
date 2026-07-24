import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySalesKey } from "@/lib/salesApi";
import { reconcileTenantBilling } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ tenantId: z.string().min(1) });

// POST /api/sales/reconcile — after a rep-collected payment, sync a shop from Stripe.
export async function POST(req: Request) {
  if (!verifySalesKey(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await reconcileTenantBilling(parsed.data.tenantId);
  const t = await prisma.tenant.findUnique({
    where: { id: parsed.data.tenantId },
    select: { status: true, subscriptionStatus: true },
  });
  return NextResponse.json(t ?? { error: "not found" });
}
