/**
 * Email delivery. Uses the Resend HTTP API when RESEND_API_KEY is set;
 * otherwise logs the message to the server console so flows still work in dev
 * and before a provider is connected.
 */
const FROM = process.env.EMAIL_FROM || "The Chair <onboarding@resend.dev>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; logged?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `\n[email:log-only] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`,
    );
    return { ok: true, logged: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${text}` };
    }
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
