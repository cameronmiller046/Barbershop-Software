"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePortalStaff } from "@/lib/rbac";
import { audit } from "@/lib/audit";

// Compressed client-side to a JPEG data URL (see lib/clientImage). Cap the stored
// string so a giant paste can't bloat the row.
const MAX_LEN = 2_000_000; // ~1.5 MB image

/** Any full-portal staff (barbers included) can post a cut photo to the gallery. */
export async function addGalleryPhoto(formData: FormData) {
  const user = await requirePortalStaff();
  const imageUrl = String(formData.get("imageUrl") ?? "");
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 140);
  if (!imageUrl.startsWith("data:image/") || imageUrl.length > MAX_LEN) return;

  const max = await prisma.galleryItem.aggregate({
    where: { tenantId: user.tenantId },
    _max: { sortOrder: true },
  });
  await prisma.galleryItem.create({
    data: {
      tenantId: user.tenantId,
      imageUrl,
      caption: caption || null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  await audit({ action: "gallery.add", tenantId: user.tenantId, userId: user.id });
  revalidatePath("/portal/portfolio");
}

/** Remove a photo (only from the poster's own shop). */
export async function deleteGalleryPhoto(formData: FormData) {
  const user = await requirePortalStaff();
  const id = String(formData.get("id") ?? "");
  const item = await prisma.galleryItem.findUnique({ where: { id }, select: { tenantId: true } });
  if (!item || item.tenantId !== user.tenantId) return;
  await prisma.galleryItem.delete({ where: { id } });
  await audit({ action: "gallery.delete", tenantId: user.tenantId, userId: user.id, target: id });
  revalidatePath("/portal/portfolio");
}
