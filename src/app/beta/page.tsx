import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { BetaForm } from "@/components/BetaForm";

export const metadata = { title: "Request beta access — The Chair" };

export default function BetaPage() {
  return (
    <div className="min-h-screen mkt">
      <MarketingHeader />
      <section className="container-page max-w-xl py-16">
        <h1 className="font-display text-4xl">Request beta access</h1>
        <p className="mt-3 text-cream/70">
          Tell us about your shop. We review every application by hand and set up
          your branded site and portal for you.
        </p>
        <div className="mt-8">
          <BetaForm />
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
