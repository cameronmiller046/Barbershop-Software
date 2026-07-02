import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  createBarber, toggleBarber, updateStaffProfile, setStaffAvatar,
  setKioskMode, createKioskAccount, deleteKioskAccount,
} from "@/app/portal/actions";
import { roleLabel } from "@/lib/roles";
import { can } from "@/lib/permissions";
import { planLimits } from "@/lib/plans";
import { ImageUpload } from "@/components/ImageUpload";

export const dynamic = "force-dynamic";

const dateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ err?: string; kioskErr?: string; kiosk?: string }> }) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.team")) redirect("/portal");
  const sp = await searchParams;

  const [team, devices, tenant] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { in: ["BARBER", "RECEPTIONIST"] }, kioskOnly: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { tenantId: user.tenantId, kioskOnly: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, active: true },
    }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plan: true } }),
  ]);
  const limits = planLimits(tenant?.plan ?? "SOLO");
  const atCap = team.length >= limits.maxBarbers;
  const capLabel = limits.maxBarbers === Infinity ? "unlimited" : String(limits.maxBarbers);

  return (
    <div>
      <h1 className="font-display text-3xl">Team</h1>
      <p className="mt-1 text-cream/60">
        Manage staff, their profile, and HR details ·{" "}
        <span className="text-cream/80">{team.length} / {capLabel} chairs</span>{" "}
        <span className="text-cream/40">({limits.label} plan)</span>
      </p>
      {sp.err === "limit" && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          You&apos;ve reached your {limits.label} plan&apos;s limit of {capLabel} chair{limits.maxBarbers === 1 ? "" : "s"}. Upgrade to add more barbers.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {team.length === 0 ? (
            <div className="card text-cream/60">No staff yet — add your first barber.</div>
          ) : (
            team.map((m) => (
              <div key={m.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{m.name} {!m.active && <span className="chip ml-1">inactive</span>}</div>
                    <div className="text-sm text-cream/50">
                      {m.email} · {roleLabel(m.role)}
                      {m.hireDate && <> · since {new Date(m.hireDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={setKioskMode.bind(null, m.id, true)}>
                      <button className="btn-ghost px-3 py-1.5 text-xs" title="Lock this login to the self-check-in kiosk only">
                        Restrict to kiosk
                      </button>
                    </form>
                    <form action={toggleBarber.bind(null, m.id, !m.active)}>
                      <button className="btn-ghost px-3 py-1.5 text-xs">{m.active ? "Deactivate" : "Activate"}</button>
                    </form>
                  </div>
                </div>

                <details className="mt-3 border-t border-white/10 pt-3">
                  <summary className="cursor-pointer text-sm text-brass">Edit profile &amp; HR details</summary>
                  <div className="mt-3 flex items-center gap-3">
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatarUrl} alt={m.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-smoke text-cream/50">{m.name.charAt(0)}</div>
                    )}
                    <ImageUpload action={setStaffAvatar.bind(null, m.id)} label="photo" hasImage={!!m.avatarUrl} maxW={400} />
                  </div>
                  <form action={updateStaffProfile.bind(null, m.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div><label className="label">Name</label><input name="name" defaultValue={m.name} className="input" /></div>
                    <div><label className="label">Instagram</label><input name="instagramHandle" defaultValue={m.instagramHandle ?? ""} placeholder="handle" className="input" /></div>
                    <div><label className="label">Hire date</label><input name="hireDate" type="date" defaultValue={dateInput(m.hireDate)} className="input" /></div>
                    <div><label className="label">Date of birth</label><input name="dateOfBirth" type="date" defaultValue={dateInput(m.dateOfBirth)} className="input" /></div>
                    <div className="sm:col-span-2"><label className="label">Bio</label><input name="bio" defaultValue={m.bio ?? ""} className="input" /></div>
                    <div className="sm:col-span-2"><button className="btn-primary">Save details</button></div>
                  </form>
                </details>
              </div>
            ))
          )}
        </div>

        <aside className="card h-max">
          <h2 className="font-display text-xl">Add staff</h2>
          {atCap ? (
            <div className="mt-4 space-y-3 text-sm text-cream/70">
              <p>You&apos;re using all <span className="text-cream">{capLabel}</span> chairs on the {limits.label} plan.</p>
              <p className="text-cream/50">Upgrade to add more barbers.</p>
            </div>
          ) : (
            <form action={createBarber} className="mt-4 space-y-3">
              <div><label className="label">Name</label><input name="name" required className="input" /></div>
              <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
              <div><label className="label">Temporary password</label><input name="password" type="text" required minLength={6} className="input" /></div>
              <div><label className="label">Bio (optional)</label><input name="bio" className="input" /></div>
              <button className="btn-primary w-full">Add barber</button>
            </form>
          )}
        </aside>
      </div>

      {/* ── Self check-in kiosk ── */}
      <div className="mt-12 border-t border-white/10 pt-8">
        <h2 className="font-display text-2xl">Self check-in kiosk</h2>
        <p className="mt-1 max-w-2xl text-cream/60">
          Put a tablet or computer at your front desk so clients can check themselves in and join the walk-in queue.
          Create a device login below (or hit <span className="text-cream/80">Restrict to kiosk</span> on any staff member) —
          that login only ever sees the check-in screen.
        </p>

        {sp.kiosk === "created" && (
          <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Device created. Sign in on the tablet with that email &amp; password — it opens straight to check-in.
          </p>
        )}
        {sp.kioskErr === "email" && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">That email is already in use.</p>
        )}
        {sp.kioskErr === "fields" && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">Enter a login email and a password of at least 6 characters.</p>
        )}

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {devices.length === 0 ? (
              <div className="card text-cream/60">
                No check-in devices yet. Add one on the right, then sign in with it on your front-desk tablet.
              </div>
            ) : (
              devices.map((d) => (
                <div key={d.id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {d.name} <span className="chip ml-1">kiosk</span>
                      {!d.active && <span className="chip ml-1">inactive</span>}
                    </div>
                    <div className="text-sm text-cream/50">{d.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={setKioskMode.bind(null, d.id, false)}>
                      <button className="btn-ghost px-3 py-1.5 text-xs" title="Turn this back into a normal staff login">Unrestrict</button>
                    </form>
                    <form action={deleteKioskAccount.bind(null, d.id)}>
                      <button className="btn-ghost px-3 py-1.5 text-xs text-red-300 hover:text-red-200">Remove</button>
                    </form>
                  </div>
                </div>
              ))
            )}
            <Link href="/kiosk" target="_blank" rel="noreferrer" className="inline-block text-sm text-brass hover:underline">
              Open the check-in kiosk on this device ↗
            </Link>
          </div>

          <aside className="card h-max">
            <h3 className="font-display text-xl">Add a check-in device</h3>
            <p className="mt-1 text-xs text-cream/50">A login locked to the check-in screen. It doesn&apos;t use a chair.</p>
            <form action={createKioskAccount} className="mt-4 space-y-3">
              <div><label className="label">Device name</label><input name="name" placeholder="Front desk iPad" className="input" /></div>
              <div><label className="label">Login email</label><input name="email" type="email" required className="input" /></div>
              <div><label className="label">Password</label><input name="password" type="text" required minLength={6} className="input" /></div>
              <button className="btn-primary w-full">Create device login</button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
