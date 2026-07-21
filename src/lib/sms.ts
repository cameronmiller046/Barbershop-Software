/**
 * SMS delivery. Uses Twilio's REST API when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * and TWILIO_FROM are set; otherwise logs the message to the server console so
 * flows still work in dev and before a provider is connected (mirrors lib/email).
 */
export function smsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; logged?: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
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
