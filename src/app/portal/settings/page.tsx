import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { updateTenant } from "@/app/portal/actions";
import { appUrl } from "@/lib/utils";
import { can } from "@/lib/permissions";

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
        <div className="flex items-center gap-3">
          <div>
            <label className="label">Brand color</label>
            <input name="primaryColor" type="color" defaultValue={tenant.primaryColor} className="h-11 w-16 rounded-lg border border-white/10 bg-smoke" />
          </div>
          <p className="text-sm text-cream/50">Recolors your whole site &amp; booking buttons.</p>
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
    </div>
  );
}
