import { NextResponse } from "next/server";
import { z } from "zod";
import { salesEnroll } from "@/lib/salesEnroll";
import { verifySalesKey } from "@/lib/salesApi";
import { parsePlanKey, planLimits } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  businessName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  ownerEmail: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  plan: z.string(),
  salesRepId: z.string().min(1),
  salesRepEmail: z.string().email().optional().nullable(),
  collectNow: z.boolean().optional(),
});

// POST /api/sales/enroll — the sales app creates a client shop here.
export async function POST(req: Request) {
  if (!verifySalesKey(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const plan = parsePlanKey(parsed.data.plan);
  if (!plan || !planLimits(plan).offeredAtSignup || planLimits(plan).contactSales) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const result = await salesEnroll({ ...parsed.data, plan });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Enrollment failed" }, { status: 409 });
  }
}
