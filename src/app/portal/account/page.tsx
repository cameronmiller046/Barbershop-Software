import { requireTenantStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/roles";
import { updateOwnProfile, changeOwnPassword } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  // date-only values are stored at UTC midnight; render in UTC to avoid an off-by-one day
  return d ? d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "—";
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; pw?: string }> }) {
  const session = await requireTenantStaff();
  const sp = await searchParams;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return null;

  const pwMsg =
    sp.pw === "ok" ? { ok: true, text: "Password updated." }
    : sp.pw === "bad" ? { ok: false, text: "Current password is incorrect." }
    : sp.pw === "short" ? { ok: false, text: "New password must be at least 6 characters." }
    : null;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">My account</h1>
      <p className="mt-1 text-cream/60">Update your display name, photo, and password.</p>

      {sp.saved && (
        <div className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200">Profile saved.</div>
      )}

      {/* Editable profile */}
      <form action={updateOwnProfile} className="card mt-6 space-y-4">
        <h2 className="font-display text-xl">Profile</h2>
        <div>
          <label className="label">Display name <span className="text-cream/40">(shown to customers &amp; on booking)</span></label>
          <input name="name" defaultValue={user.name} required className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Instagram handle</label>
            <input name="instagramHandle" defaultValue={user.instagramHandle ?? ""} placeholder="yourhandle" className="input" />
          </div>
          <div>
            <label className="label">Photo URL</label>
            <input name="avatarUrl" defaultValue={user.avatarUrl ?? ""} placeholder="https://…" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea name="bio" defaultValue={user.bio ?? ""} className="input min-h-[80px]" />
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="label">Your social links <span className="text-cream/40">(shown on your profile on the shop site)</span></div>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div><label className="label">Facebook URL</label><input name="facebookUrl" defaultValue={user.facebookUrl ?? ""} placeholder="https://facebook.com/you" className="input" /></div>
            <div><label className="label">TikTok URL</label><input name="tiktokUrl" defaultValue={user.tiktokUrl ?? ""} placeholder="https://tiktok.com/@you" className="input" /></div>
            <div><label className="label">X (Twitter) URL</label><input name="xUrl" defaultValue={user.xUrl ?? ""} placeholder="https://x.com/you" className="input" /></div>
            <div><label className="label">YouTube URL</label><input name="youtubeUrl" defaultValue={user.youtubeUrl ?? ""} placeholder="https://youtube.com/@you" className="input" /></div>
          </div>
        </div>

        <button className="btn-primary">Save profile</button>
      </form>

      {/* Password */}
      <form action={changeOwnPassword} className="card mt-6 space-y-4">
        <h2 className="font-display text-xl">Password</h2>
        {pwMsg && (
          <div className={`rounded-lg px-3 py-2 text-sm ${pwMsg.ok ? "border border-green-500/40 bg-green-500/10 text-green-200" : "border border-red-500/40 bg-red-500/10 text-red-200"}`}>
            {pwMsg.text}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Current password</label><input name="current" type="password" required className="input" /></div>
          <div><label className="label">New password</label><input name="next" type="password" minLength={6} required className="input" /></div>
        </div>
        <button className="btn-primary">Change password</button>
      </form>

      {/* Read-only / admin-managed */}
      <div className="card mt-6">
        <h2 className="font-display text-xl">Employment details</h2>
        <p className="mt-1 text-xs text-cream/50">Managed by your shop — contact an admin to change these.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div><dt className="label">Login email / username</dt><dd>{user.email}</dd></div>
          <div><dt className="label">Level</dt><dd>{roleLabel(user.role)}</dd></div>
          <div><dt className="label">First hire date</dt><dd>{fmtDate(user.hireDate)}</dd></div>
          <div><dt className="label">Date of birth</dt><dd>{fmtDate(user.dateOfBirth)}</dd></div>
        </dl>
      </div>
    </div>
  );
}
