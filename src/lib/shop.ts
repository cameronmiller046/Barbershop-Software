import type { Tenant } from "@prisma/client";

export type ShopLink = { href: string; label: string; exact?: boolean };

/** Public shop navigation, built from the shop's section-visibility toggles. */
export function shopNavLinks(t: Tenant): ShopLink[] {
  const base = `/t/${t.slug}`;
  return [
    { href: base, label: "Home", exact: true },
    { href: `${base}/services`, label: "Services" },
    ...(t.showBarbers ? [{ href: `${base}/barbers`, label: "Barbers" }] : []),
    ...(t.showGallery ? [{ href: `${base}/gallery`, label: "Gallery" }] : []),
    ...(t.showReviews ? [{ href: `${base}/reviews`, label: "Reviews" }] : []),
    ...(t.description ? [{ href: `${base}/about`, label: "About" }] : []),
    ...(t.showFaq ? [{ href: `${base}/faq`, label: "FAQ" }] : []),
    { href: `${base}/contact`, label: "Contact" },
  ];
}

export function bookLabelOf(t: Tenant) {
  return t.heroCtaText?.trim() || "Book Appointment";
}
