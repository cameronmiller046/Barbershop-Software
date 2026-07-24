"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// On-page Stripe Payment Element, styled to the lux dark theme. Card fields are
// Stripe-hosted iframes — card data goes straight to Stripe, never to our server.
export function StripePayment({
  clientSecret, mode, publishableKey, planLabel, price, tenantId,
  title, submitLabel, returnPath,
}: {
  clientSecret: string;
  mode: "payment" | "setup";
  publishableKey: string;
  planLabel?: string;
  price?: string;
  tenantId: string;
  title?: string;
  submitLabel?: string;
  returnPath?: string; // where Stripe returns after confirm (default: /signup/success)
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary: "#c9a24b",
      colorBackground: "#141312",
      colorText: "#f0ead9",
      colorTextSecondary: "#b9b2a2",
      colorDanger: "#f87171",
      fontFamily: "system-ui, -apple-system, sans-serif",
      borderRadius: "12px",
      spacingUnit: "4px",
    },
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <InnerForm
        mode={mode} planLabel={planLabel} price={price} tenantId={tenantId}
        title={title} submitLabel={submitLabel} returnPath={returnPath}
      />
    </Elements>
  );
}

function InnerForm({
  mode, planLabel, price, tenantId, title, submitLabel, returnPath,
}: {
  mode: "payment" | "setup";
  planLabel?: string;
  price?: string;
  tenantId: string;
  title?: string;
  submitLabel?: string;
  returnPath?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const path = returnPath ?? `/signup/success?tenant=${tenantId}`;
    const return_url = `${window.location.origin}${path}`;
    const result =
      mode === "setup"
        ? await stripe.confirmSetup({ elements, confirmParams: { return_url } })
        : await stripe.confirmPayment({ elements, confirmParams: { return_url } });

    // On success Stripe redirects to return_url; we only get here on error.
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const defaultSubmit = mode === "setup" ? "Save card" : price ? `Pay ${price}` : "Confirm";

  return (
    <form onSubmit={submit} className="glass space-y-5 rounded-2xl p-6 sm:p-7">
      <div>
        <h1 className="font-display text-2xl text-cream">{title ?? "Payment details"}</h1>
        {planLabel && (
          <p className="mt-1 text-sm text-cream/55">
            {planLabel} — <span className="font-semibold text-brass">{price}/mo</span>
            {mode === "setup" ? " · 14-day free trial" : ""}
          </p>
        )}
        <div className="gold-hairline mt-3" />
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      <button type="submit" disabled={!stripe || loading} className="btn-gold w-full disabled:opacity-50">
        {loading ? "Processing…" : submitLabel ?? defaultSubmit}
      </button>

      <p className="text-center text-xs text-cream/40">🔒 Secured by Stripe · your card details never touch our servers.</p>
    </form>
  );
}
