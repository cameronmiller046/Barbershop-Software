import { notFound } from "next/navigation";
import { TenantShell } from "@/components/TenantShell";
import { getTenantBySlug, getTenantReviews } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const reviews = await getTenantReviews(tenant.id);
  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <TenantShell tenant={tenant} active="reviews">
      <section className="container-page py-14">
        <h1 className="font-display text-4xl">Reviews</h1>
        {tenant.googleRating != null ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="font-display text-3xl" style={{ color: tenant.primaryColor }}>{tenant.googleRating.toFixed(1)}</span>
            <div>
              <div style={{ color: tenant.primaryColor }}>{"★".repeat(Math.round(tenant.googleRating))}{"☆".repeat(5 - Math.round(tenant.googleRating))}</div>
              <div className="text-xs text-cream/50">Rated on Google</div>
            </div>
          </div>
        ) : avg ? (
          <p className="mt-2 text-cream/60">
            <span style={{ color: tenant.primaryColor }}>★</span> {avg} average from {reviews.length} reviews
          </p>
        ) : null}
        {reviews.length === 0 ? (
          <div className="card mt-8 text-cream/60">No reviews yet — be the first after your visit!</div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card">
                <div style={{ color: tenant.primaryColor }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                <p className="mt-2 text-cream/80">“{r.body}”</p>
                <p className="mt-3 text-sm text-cream/50">— {r.authorName}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </TenantShell>
  );
}
