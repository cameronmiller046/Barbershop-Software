import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Manual/external trigger for the reminder job (the built-in scheduler already
// runs it every 5 min). Protected by CRON_SECRET when that env var is set.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (token !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendDueReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }
