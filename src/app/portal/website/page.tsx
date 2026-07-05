import { redirect } from "next/navigation";
import { requireStaffWithPerms } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { appUrl } from "@/lib/utils";
import { WebsiteCMS, type CmsTenant } from "@/components/portal/WebsiteCMS";

export const dynamic = "force-dynamic";

export default async function WebsitePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireStaffWithPerms();
  if (!can(user, "shop.settings")) redirect("/portal");
  const sp = await searchParams;
  const t = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      name: true, slug: true, tagline: true, description: true, website: true, phone: true, email: true, address: true,
      heroHeadline: true, heroSubheading: true, heroCtaText: true, announcement: true,
      instagramUrl: true, facebookUrl: true, tiktokUrl: true, xUrl: true, youtubeUrl: true, metaTitle: true, metaDescription: true, accentColor: true,
      logoUrl: true, faviconUrl: true, heroImageUrl: true, coverImageUrl: true,
      showBarbers: true, showGallery: true, showReviews: true, showFaq: true,
    },
  });
  if (!t) redirect("/portal");

  return <WebsiteCMS t={t as CmsTenant} siteUrl={appUrl(`/t/${t.slug}`)} saved={!!sp.saved} />;
}
