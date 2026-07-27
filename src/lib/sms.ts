/**
 * SMS delivery via Twilio. Credentials resolve per shop first (a manager can
 * connect their own Twilio account in Settings), falling back to server env
 * (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM). When nothing is
 * configured, messages are logged to the console so flows still work in dev and
 * before a provider is connected (mirrors lib/email).
 */
export type TwilioCreds = { accountSid?: string | null; authToken?: string | null; from?: string | null };

// Standard carrier opt-out / opt-in / help keywords (case-insensitive, first word).
const STOP_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "optout", "revoke"]);
const START_WORDS = new Set(["start", "unstop", "yes", "optin"]);
const HELP_WORDS = new Set(["help", "info"]);

export type SmsKeyword = "stop" | "start" | "help" | null;

/** Classify an inbound SMS body as a compliance keyword (STOP/START/HELP) or null. */
export function parseSmsKeyword(body: string): SmsKeyword {
  const first = (body || "").trim().toLowerCase().split(/\s+/)[0] || "";
  if (STOP_WORDS.has(first)) return "stop";
  if (START_WORDS.has(first)) return "start";
  if (HELP_WORDS.has(first)) return "help";
  return null;
}

/** Normalize a phone to its digit run (last 10 for US) for matching stored numbers. */
export function phoneDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

function resolve(creds?: TwilioCreds) {
  return {
    sid: creds?.accountSid || process.env.TWILIO_ACCOUNT_SID || "",
    token: creds?.authToken || process.env.TWILIO_AUTH_TOKEN || "",
    from: creds?.from || process.env.TWILIO_FROM || "",
  };
}

/** Whether SMS can be sent given a shop's creds (or the server env fallback). */
export function smsReady(creds?: TwilioCreds): boolean {
  const { sid, token, from } = resolve(creds);
  return !!(sid && token && from);
}

export async function sendSms(to: string, body: string, creds?: TwilioCreds): Promise<{ ok: boolean; logged?: boolean; error?: string }> {
  const { sid, token, from } = resolve(creds);
  const digits = to.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length < 7) return { ok: false, error: "invalid phone" };

  if (!sid || !token || !from) {
    console.log(`\n[sms:log-only] To: ${to}\n${body}\n`);
    return { ok: true, logged: true };
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: digits, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
