import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/email";
import { appUrl } from "@/lib/utils";

// Password reset via single-use, hashed, time-boxed tokens.
//
// The raw token travels only in the emailed link; we persist its sha256 so a DB
// leak can't be replayed. Requests never reveal whether an email is registered
// (anti-enumeration) — the caller always shows the same confirmation.

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

/** Basic policy shared with the in-portal change form: 8+ chars, a letter and a number. */
export function passwordValid(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

/**
 * Issue a reset token for the email and send the link. Always resolves quietly
 * (never throws, never reveals whether the account exists). Only active accounts
 * with a real password login get an email.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  if (!email) return;
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, active: true, name: true } });
    if (!user || !user.active) return;

    // Invalidate any outstanding tokens for this user, then mint a fresh one.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { tokenHash: sha256(raw), userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const link = appUrl(`/reset?token=${raw}`);
    await sendEmail({
      to: email,
      subject: "Reset your The Chair password",
      html: emailLayout("Reset your password", `
        <p>Hi ${user.name || "there"},</p>
        <p>We received a request to reset your password. This link is valid for one hour
           and can be used once:</p>
        <p><a href="${link}" style="display:inline-block;background:#c9a24b;color:#0f0f10;
           padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Reset password</a></p>
        <p style="font-size:13px;color:#8a8a8a">If you didn't request this, you can safely
           ignore this email — your password won't change.</p>
      `),
    });
    await audit({ action: "account.password.reset_requested", userId: user.id });
  } catch (err) {
    // Swallow — the caller must not be able to distinguish success from failure.
    console.error("[reset] requestPasswordReset failed:", err);
  }
}

export type ResetResult = "ok" | "invalid" | "weak";

/**
 * Consume a reset token and set the new password. Returns "invalid" for an
 * unknown/expired/used token, "weak" if the new password fails policy.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetResult> {
  const token = (rawToken || "").trim();
  if (!token) return "invalid";
  if (!passwordValid(newPassword)) return "weak";

  try {
    const rec = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!rec || rec.usedAt || rec.expiresAt.getTime() < Date.now()) return "invalid";

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // Mark the token used and clear any lockout in one go.
    await prisma.$transaction([
      prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
      prisma.user.update({
        where: { id: rec.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
      // Retire any other live tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: { userId: rec.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    await audit({ action: "account.password.reset", userId: rec.userId });
    return "ok";
  } catch (err) {
    console.error("[reset] resetPassword failed:", err);
    return "invalid";
  }
}
