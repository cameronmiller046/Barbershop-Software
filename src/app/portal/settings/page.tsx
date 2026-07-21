import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updateTenant, setTenantImage, setHeroPosition, updateLoyalty } from "@/app/portal/actions";
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
    </div>
  );
}
