/**
 * Email delivery. Resolves per shop first — a manager can connect their own
 * SendGrid (Twilio's email) key + from address in Settings — then falls back to
 * the server's Resend env (RESEND_API_KEY / EMAIL_FROM). When nothing is
 * configured, the message is logged to the console so flows still work in dev.
 */
export type EmailCreds = { sendgridApiKey?: string | null; from?: string | null };

const DEFAULT_FROM = process.env.EMAIL_FROM || "The Chair <onboarding@resend.dev>";

/** Whether email can be sent given a shop's creds (or the server env fallback). */
export function emailReady(creds?: EmailCreds): boolean {
  return !!(creds?.sendgridApiKey || process.env.RESEND_API_KEY);
}

function parseFrom(from: string): { email: string; name?: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { email: m[2].trim(), name: m[1].trim() || undefined };
  return { email: from.trim() };
}

export async function sendEmail(
  opts: { to: string; subject: string; html: string },
  creds?: EmailCreds,
): Promise<{ ok: boolean; logged?: boolean; error?: string }> {
  const fromStr = creds?.from || DEFAULT_FROM;

  // 1) Per-shop SendGrid.
  if (creds?.sendgridApiKey) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${creds.sendgridApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: opts.to }] }],
          from: parseFrom(fromStr),
          subject: opts.subject,
          content: [{ type: "text/html", value: opts.html }],
        }),
      });
      if (!res.ok) return { ok: false, error: `SendGrid ${res.status}: ${await res.text()}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  // 2) Server-wide Resend.
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[email:log-only] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`);
    return { ok: true, logged: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromStr, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export function emailLayout(title: string, bodyHtml: string) {
  return `<div style="font-family:Arial,sans-serif;background:#0f0f10;color:#f5f1e8;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#1a1a1d;border:1px solid #2a2a2e;border-radius:16px;padding:28px">
    <h1 style="font-size:20px;color:#c9a24b;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="margin-top:28px;font-size:12px;color:#8a8a8a">The Chair — barbershop software</p>
  </div>
</div>`;
}
