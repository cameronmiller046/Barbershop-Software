import { prisma } from "@/lib/prisma";

/** Load an ACTIVE/PENDING tenant by its slug. Returns null if missing. */
export async function getTenantBySlug(slug: string) {
  try {
    return await prisma.tenant.findUnique({ where: { slug } });
  } catch {
    return null;
  }
}

/** Public services for a tenant's website + booking. */
export async function getTenantServices(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId, active: true },
    orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
    include: { barber: { select: { id: true, name: true } } },
  });
}

/** Barbers (staff who take appointments) for a tenant. */
export async function getTenantBarbers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, role: "BARBER", active: true, kioskOnly: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, bio: true, avatarUrl: true, instagramHandle: true },
  });
}

export async function getTenantGallery(tenantId: string) {
  return prisma.galleryItem.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getTenantReviews(tenantId: string) {
  return prisma.review.findMany({
    where: { tenantId, published: true },
    orderBy: { createdAt: "desc" },
  });
}
