import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updateTenant, setTenantImage, setHeroPosition, updateLoyalty, updateReminders, updateTwilio, updateEmailSender, startConnectOnboarding, refreshConnectStatus, updateDepositSettings } from "@/app/portal/actions";
import { connectEnabled } from "@/lib/connect";
import { formatMoney } from "@/lib/utils";
import { smsReady } from "@/lib/sms";
import { emailReady } from "@/lib/email";
import { appUrl } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { ImageUpload } from "@/components/ImageUpload";
import { HeroFocusPicker } from "@/components/HeroFocusPicker";
import { SiteColors } from "@/components/SiteColors";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.settings")) redirect("/portal");
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) redirect("/portal");

  // Whether SMS can actually send (this shop's Twilio, or the server fallback).
  // NOTE: the auth token itself is never rendered — only this boolean.
  const smsConnected = smsReady({ accountSid: tenant.twilioAccountSid, authToken: tenant.twilioAuthToken, from: tenant.twilioFromNumber });
  const emailConnected = emailReady({ sendgridApiKey: tenant.sendgridApiKey });

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Shop settings</h1>
      <p className="mt-1 text-cream/60">
        Your site: <a href={appUrl(`/t/${tenant.slug}`)} target="_blank" rel="noreferrer" className="text-brass">/t/{tenant.slug}</a>
      </p>

      <form action={updateTenant} className="card mt-6 space-y-4">
        <div><label className="label">Shop name</label><input name="name" defaultValue={tenant.name} className="input" /></div>
        <div><label className="label">Tagline</label><input name="tagline" defaultValue={tenant.tagline ?? ""} className="input" /></div>
        <div className="border-t border-white/10 pt-4">
          <label className="label">Site colors</label>
          <SiteColors initialPrimary={tenant.primaryColor} initialSecondary={tenant.secondaryColor} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Phone</label><input name="phone" defaultValue={tenant.phone ?? ""} className="input" /></div>
          <div><label className="label">Email</label><input name="email" defaultValue={tenant.email ?? ""} className="input" /></div>
        </div>
        <div><label className="label">Address</label><input name="address" defaultValue={tenant.address ?? ""} className="input" /></div>
        <div>
          <label className="label">Monthly sales goal ($)</label>
          <input name="monthlyGoal" type="number" min="0" step="50" inputMode="numeric"
            defaultValue={tenant.monthlyGoalCents ? Math.round(tenant.monthlyGoalCents / 100) : ""}
            placeholder="e.g. 12000" className="input" />
          <p className="mt-1 text-xs text-cream/50">Drives the goal & pace tracking on your Reports dashboard. Leave blank to use a suggested target.</p>
        </div>
        <button className="btn-primary">Save changes</button>
      </form>

      <div className="card mt-6 space-y-5">
        <div>
          <h2 className="font-display text-xl">Branding images</h2>
          <p className="mt-1 text-sm text-cream/50">Shown across your public site. Uploads are compressed automatically.</p>
        </div>

        <div className="flex items-center gap-4">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt="Logo" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-full bg-smoke text-cream/40">Logo</div>
          )}
          <div>
            <div className="label">Logo</div>
            <ImageUpload action={setTenantImage.bind(null, "logoUrl")} label="logo" hasImage={!!tenant.logoUrl} maxW={400} />
          </div>
        </div>

        <div>
          <div className="label">Hero photo</div>
          {tenant.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.heroImageUrl} alt="Hero" className="mb-2 h-36 w-full rounded-lg object-cover" />
          )}
          <ImageUpload action={setTenantImage.bind(null, "heroImageUrl")} label="hero photo" hasImage={!!tenant.heroImageUrl} maxW={1600} />
          <p className="mt-1 text-xs text-cream/40">The big photo behind your homepage headline.</p>
        </div>

        {tenant.heroImageUrl && (
          <div>
            <div className="label">Hero focus</div>
            <HeroFocusPicker src={tenant.heroImageUrl} initial={tenant.heroImagePosition} action={setHeroPosition} />
          </div>
        )}
      </div>

      {/* ── Loyalty program ── */}
      <form action={updateLoyalty} className="card mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Loyalty program</h2>
          <p className="mt-1 text-sm text-cream/50">Reward regulars automatically. Points accrue on every completed visit; a client earns a reward once they reach the threshold.</p>
          <p className="mt-2 rounded-lg border border-brass/20 bg-brass/[0.05] px-3 py-2 text-xs text-cream/60">
            Guardrails: a reward costs up to <b className="text-cream/80">100 points</b> and is worth up to <b className="text-cream/80">$10 off</b>, balances are capped at <b className="text-cream/80">200 points</b>, and points <b className="text-cream/80">expire 90 days</b> after they&apos;re earned.
          </p>
        </div>

        <label className="flex items-center gap-3">
          <input type="checkbox" name="loyaltyEnabled" defaultChecked={tenant.loyaltyEnabled} className="h-4 w-4 accent-[color:var(--brand)]" />
          <span className="text-sm text-cream/85">Enable the loyalty program</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Points per visit</label>
            <input name="pointsPerVisit" type="number" min="0" max="1000" step="1" inputMode="numeric" defaultValue={tenant.loyaltyPointsPerVisit} className="input" />
            <p className="mt-1 text-xs text-cream/45">10/visit + a 100-point reward ≈ every 10th visit.</p>
          </div>
          <div>
            <label className="label">Bonus points per $1 spent</label>
            <input name="pointsPerDollar" type="number" min="0" max="100" step="1" inputMode="numeric" defaultValue={tenant.loyaltyPointsPerDollar} className="input" />
            <p className="mt-1 text-xs text-cream/45">Set to 0 for a simple visit-based punch card.</p>
          </div>
        </div>

        <div>
          <label className="label">Points needed for a reward (max 100)</label>
          <input name="threshold" type="number" min="1" max="100" step="1" inputMode="numeric" defaultValue={tenant.loyaltyThreshold} className="input" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Reward</label>
            <input name="rewardLabel" defaultValue={tenant.loyaltyRewardLabel} placeholder="$10 off" className="input" />
          </div>
          <div>
            <label className="label">Reward value ($, max 10)</label>
            <input name="rewardValue" type="number" min="0" max="10" step="1" inputMode="numeric" defaultValue={tenant.loyaltyRewardValueCents ? Math.round(tenant.loyaltyRewardValueCents / 100) : ""} placeholder="e.g. 10" className="input" />
            <p className="mt-1 text-xs text-cream/45">Capped at $10 off per reward.</p>
          </div>
        </div>

        <button className="btn-primary">Save loyalty settings</button>
      </form>

      {/* ── Appointment reminders ── */}
      <form action={updateReminders} className="card mt-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Appointment reminders</h2>
          <p className="mt-1 text-sm text-cream/50">Automatically remind clients before their appointment so fewer no-shows slip through.</p>
        </div>

        <label className="flex items-center gap-3">
          <input type="checkbox" name="remindersEnabled" defaultChecked={tenant.remindersEnabled} className="h-4 w-4 accent-[color:var(--brand)]" />
          <span className="text-sm text-cream/85">Enable appointment reminders</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3">
            <input type="checkbox" name="reminderEmail" defaultChecked={tenant.reminderEmail} className="h-4 w-4 accent-[color:var(--brand)]" />
            <span className="text-sm text-cream/85">Email reminders</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="reminderSms" defaultChecked={tenant.reminderSms} className="h-4 w-4 accent-[color:var(--brand)]" />
            <span className="text-sm text-cream/85">SMS reminders</span>
          </label>
        </div>

        <div>
          <label className="label">Send how many hours before?</label>
          <input name="reminderHoursBefore" type="number" min="1" max="168" step="1" inputMode="numeric" defaultValue={tenant.reminderHoursBefore} className="input" />
          <p className="mt-1 text-xs text-cream/45">e.g. 24 = about a day ahead. Reminders send only for confirmed, upcoming appointments.</p>
        </div>

        {!smsConnected && (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200/90">
            SMS isn&apos;t connected yet — add your Twilio credentials in <b>SMS provider (Twilio)</b> below to start texting. Until then, SMS reminders are logged only. Email works as soon as a sender is configured.
          </p>
        )}

        <button className="btn-primary">Save reminder settings</button>
      </form>

      {/* ── SMS provider (Twilio) ── */}
      <form action={updateTwilio} className="card mt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">SMS provider (Twilio)</h2>
            <p className="mt-1 text-sm text-cream/50">Connect your own Twilio account to send text reminders from your shop&apos;s number.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${smsConnected ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-cream/50"}`}>
            {smsConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        <div>
          <label className="label">Account SID</label>
          <input name="twilioAccountSid" defaultValue={tenant.twilioAccountSid ?? ""} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" autoComplete="off" className="input font-mono text-sm" />
        </div>
        <div>
          <label className="label">Auth Token</label>
          <input name="twilioAuthToken" type="password" placeholder={tenant.twilioAuthToken ? "•••••••• (leave blank to keep current)" : "Your Twilio auth token"} autoComplete="off" className="input font-mono text-sm" />
          <p className="mt-1 text-xs text-cream/45">Stored securely and never shown again. Leave blank to keep the current token.</p>
        </div>
        <div>
          <label className="label">From number</label>
          <input name="twilioFromNumber" defaultValue={tenant.twilioFromNumber ?? ""} placeholder="+15551234567" autoComplete="off" className="input" />
          <p className="mt-1 text-xs text-cream/45">Your Twilio phone number (E.164 format). Clear the Account SID and save to disconnect.</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-cream/50">
          Find these in your Twilio Console → Account Info. Texting clients requires their consent; reminders include a &ldquo;Reply STOP to opt out&rdquo; line.
        </div>

        <button className="btn-primary">Save Twilio settings</button>
      </form>

      {/* ── Email provider (SendGrid) ── */}
      <form action={updateEmailSender} className="card mt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Email provider (SendGrid)</h2>
            <p className="mt-1 text-sm text-cream/50">Send confirmations and reminders from your own email. Uses SendGrid (Twilio&apos;s email); leave blank to use the built-in sender.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${emailConnected ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-cream/50"}`}>
            {emailConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        <div>
          <label className="label">SendGrid API key</label>
          <input name="sendgridApiKey" type="password" placeholder={tenant.sendgridApiKey ? "•••••••• (leave blank to keep current)" : "SG.xxxxxxxx"} autoComplete="off" className="input font-mono text-sm" />
          <p className="mt-1 text-xs text-cream/45">Stored securely and never shown again. Leave blank to keep the current key.</p>
        </div>
        <div>
          <label className="label">From address</label>
          <input name="emailFromAddress" defaultValue={tenant.emailFromAddress ?? ""} placeholder="Your Shop &lt;hello@yourshop.com&gt;" autoComplete="off" className="input" />
          <p className="mt-1 text-xs text-cream/45">Must be a verified sender in your SendGrid account. Clear this and save to disconnect.</p>
        </div>

        <button className="btn-primary">Save email settings</button>
      </form>

      {/* Payments & deposits (Stripe Connect) */}
      <div className="card mt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Online deposits</h2>
            <p className="mt-1 text-sm text-cream/50">Take a deposit when clients book, paid straight to your own Stripe account. Reduces no-shows.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tenant.connectChargesEnabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-cream/50"}`}>
            {tenant.connectChargesEnabled ? "Ready" : tenant.stripeConnectAccountId ? "Setup incomplete" : "Not connected"}
          </span>
        </div>

        {!connectEnabled() ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">Card payments aren&apos;t configured on this server yet.</p>
        ) : !tenant.connectChargesEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-cream/60">Connect a Stripe account to start collecting deposits. Stripe handles the payout details and your money goes directly to you.</p>
            <div className="flex flex-wrap gap-2">
              <form action={startConnectOnboarding}><button className="btn-gold">{tenant.stripeConnectAccountId ? "Continue Stripe setup" : "Connect with Stripe"}</button></form>
              {tenant.stripeConnectAccountId && <form action={refreshConnectStatus}><button className="btn-outline-gold">Refresh status</button></form>}
            </div>
          </div>
        ) : (
          <form action={updateDepositSettings} className="space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-cream/85">Require a deposit to book</span>
              <input type="checkbox" name="depositEnabled" defaultChecked={tenant.depositEnabled} className="h-5 w-5 accent-brass" />
            </label>
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <div>
                <label className="label">Type</label>
                <select name="depositType" defaultValue={tenant.depositType} className="input">
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed $</option>
                </select>
              </div>
              <div>
                <label className="label">Amount</label>
                <input name="depositValue" type="number" min="0" step="1"
                  defaultValue={tenant.depositType === "FIXED" ? (tenant.depositValue / 100).toFixed(2) : String(tenant.depositValue)}
                  className="input" />
                <p className="mt-1 text-xs text-cream/45">Percent of the service price, or a fixed dollar amount. Currently: {tenant.depositType === "FIXED" ? formatMoney(tenant.depositValue) : `${tenant.depositValue}%`}.</p>
              </div>
            </div>
            <button className="btn-primary">Save deposit settings</button>
          </form>
        )}
      </div>
    </div>
  );
}
