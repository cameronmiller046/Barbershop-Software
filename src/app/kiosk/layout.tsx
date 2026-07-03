import { requireKioskStaff } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/lib/auth";
import { readableOn, hexToRgbTriple } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KioskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireKioskStaff();
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { name: true, primaryColor: true, secondaryColor: true, logoUrl: true },
  });
  const brand = tenant?.primaryColor || "#c9a24b";
  const accent = tenant?.secondaryColor || brand;

  return (
    <div
      className="min-h-screen"
      style={{
        "--brand": brand,
        "--brand-fg": readableOn(brand),
        "--brass": hexToRgbTriple(accent),
        background: "radial-gradient(1200px 600px at 50% -10%, #17171b 0%, #0c0c0d 60%)",
      } as React.CSSProperties}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brass font-display font-bold text-ink">
                {tenant?.name?.charAt(0) ?? "S"}
              </span>
            )}
            <div>
              <div className="font-display text-lg leading-tight">{tenant?.name ?? "Our shop"}</div>
              <div className="text-xs uppercase tracking-wide text-cream/40">Self check-in</div>
            </div>
          </div>
          {user.kioskOnly && (
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="text-xs text-cream/25 transition hover:text-cream/60">End session</button>
            </form>
          )}
        </header>

        <main className="flex flex-1 flex-col justify-center py-6">{children}</main>
      </div>
    </div>
  );
}
