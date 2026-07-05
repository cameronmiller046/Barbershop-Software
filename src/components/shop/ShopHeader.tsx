import { LuxHeading } from "@/components/home/LuxBits";

/** Standard page header for inner shop pages — clears the fixed nav. */
export function ShopHeader({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 pt-36 text-center sm:pt-40">
      <LuxHeading eyebrow={eyebrow} title={title} sub={sub} />
    </section>
  );
}
