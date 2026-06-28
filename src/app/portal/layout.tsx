import Link from "next/link";
import { requireTenantStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { PortalNav } from "@/components/PortalNav";
import { signOut } from "@/lib/auth";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTenantStaff();
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brass font-display font-bold text-ink">
              {tenant?.name.charAt(0) ?? "C"}
            </span>
            <span className="font-display text-lg">{tenant?.name ?? "Portal"}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-cream/50 sm:inline">{user.name} · {user.role}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="container-page grid gap-8 py-8 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-8 md:self-start">
          <PortalNav isOwner={user.role === "OWNER"} siteUrl={appUrl(`/t/${tenant?.slug ?? ""}`)} />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
