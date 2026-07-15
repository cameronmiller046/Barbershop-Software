import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/rbac";
import { signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/tenants", label: "Stores" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/roles", label: "Roles" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brass font-display font-bold text-ink">S</span>
            <span className="font-display text-lg">Superadmin</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <nav className="hidden gap-4 md:flex">
              {LINKS.map((l) => <Link key={l.href} href={l.href} className="text-cream/70 hover:text-cream">{l.label}</Link>)}
            </nav>
            <span className="hidden text-cream/40 sm:inline">{admin.email}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <div className="container-page py-8">{children}</div>
    </div>
  );
}
