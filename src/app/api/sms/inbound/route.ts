import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { parseSmsKeyword, phoneDigits } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio inbound-SMS webhook. Handles the carrier compliance keywords so opt-out
// state lives in OUR database (not just Twilio's), which lets us suppress sends
// before they're attempted. Point a shop's Twilio number's "A MESSAGE COMES IN"
// webhook (or the Messaging Service) at POST /api/sms/inbound.
//
// We opt a number out wherever it appears (across shops) — the conservative,
// compliant direction: never keep texting a number that said STOP. Twilio still
// enforces STOP at the carrier level and sends the mandated confirmation, so we
// return an empty TwiML for STOP/START to avoid a duplicate reply.
//
// NOTE: request-signature validation (X-Twilio-Signature) is intentionally not
// enforced here yet because credentials are per-shop; the handler only toggles
// opt-out state (idempotent, reversible via START), so the blast radius is low.

function twiml(message?: string): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: Request) {
  let from = "";
  let text = "";
  try {
    const form = await req.formData();
    from = String(form.get("From") || "");
    text = String(form.get("Body") || "");
  } catch {
    return twiml();
  }

  const digits = phoneDigits(from);
  const last10 = digits.slice(-10);
  const keyword = parseSmsKeyword(text);
  if (!last10 || !keyword) return twiml();

  try {
    if (keyword === "stop") {
      // Match on the last 10 digits regardless of how the phone was stored/formatted.
      const n = await prisma.$executeRaw`
        UPDATE "Client"
        SET "smsOptOut" = true, "smsOptOutAt" = NOW()
        WHERE "smsOptOut" = false
          AND right(regexp_replace(coalesce("phone", ''), ${"[^0-9]"}, '', 'g'), 10) = ${last10}`;
      await audit({ action: "sms.optout", target: last10, meta: { clients: n } });
      return twiml();
    }
    if (keyword === "start") {
      const n = await prisma.$executeRaw`
        UPDATE "Client"
        SET "smsOptOut" = false, "smsOptOutAt" = NULL
        WHERE "smsOptOut" = true
          AND right(regexp_replace(coalesce("phone", ''), ${"[^0-9]"}, '', 'g'), 10) = ${last10}`;
      await audit({ action: "sms.optin", target: last10, meta: { clients: n } });
      return twiml();
    }
    // keyword === "help"
    return twiml("The Chair: appointment reminders. Reply STOP to unsubscribe, START to resubscribe. Msg & data rates may apply.");
  } catch (err) {
    console.error("[sms/inbound] failed:", err);
    return twiml();
  }
}
