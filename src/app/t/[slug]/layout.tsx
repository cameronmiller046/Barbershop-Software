import { PageViewTracker } from "@/components/PageViewTracker";

// Wraps every public shop page (/t/<slug>/*) so visits are counted
// anonymously. Does not alter the page markup.
export default async function TenantPublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <>
      {children}
      <PageViewTracker slug={slug} />
    </>
  );
}
