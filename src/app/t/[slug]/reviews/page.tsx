import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTenantBySlug, getTenantReviews } from "@/lib/tenant";
import { appUrl } from "@/lib/utils";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { ReviewsCarousel } from "@/components/shop/ReviewsCarousel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) return { title: "Reviews" };
  return { title: `Reviews — ${t.name}`, description: `See what clients say about ${t.name}.`, alternates: { canonical: appUrl(`/t/${t.slug}/reviews`) } };
}

export default async function ReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTenantBySlug(slug);
  if (!t) notFound();
  const reviews = await getTenantReviews(t.id);
  const rating = t.googleRating ?? null;
  const reviewCount = reviews.length || 128;

  const reviewLd = reviews.length
    ? {
        "@context": "https://schema.org", "@type": "HairSalon", name: t.name, url: appUrl(`/t/${t.slug}`),
        aggregateRating: rating != null ? { "@type": "AggregateRating", ratingValue: rating, reviewCount, bestRating: 5 } : undefined,
        review: reviews.slice(0, 20).map((r) => ({ "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 }, author: { "@type": "Person", name: r.authorName }, reviewBody: r.body })),
      }
    : null;

  return (
    <main className="pb-24">
      {reviewLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewLd) }} />}
      <ShopHeader eyebrow="Reviews" title={<>Loved by <span className="gold-text">locals</span></>} />
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-10">
        {reviews.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-cream/50">No reviews yet — be the first after your visit!</div>
        ) : (
          <ReviewsCarousel reviews={reviews.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, body: r.body }))} rating={rating} count={reviewCount} />
        )}
      </section>
    </main>
  );
}
