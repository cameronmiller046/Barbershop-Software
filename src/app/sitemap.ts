import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketing = ["", "/features", "/pricing", "/about", "/contact", "/beta"].map((r) => ({
    url: appUrl(r || "/"),
    changeFrequency: "weekly" as const,
    priority: r === "" ? 1 : 0.7,
  }));

  let shops: MetadataRoute.Sitemap = [];
  try {
    const tenants = await prisma.tenant.findMany({ where: { status: "ACTIVE", isDemo: false }, select: { slug: true } });
    shops = tenants.flatMap((t) =>
      ["", "/services", "/book", "/contact"].map((sub) => ({
        url: appUrl(`/t/${t.slug}${sub}`),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    );
  } catch {
    /* DB unavailable (e.g. at build) — ship the marketing sitemap only. */
  }

  return [...marketing, ...shops];
}
