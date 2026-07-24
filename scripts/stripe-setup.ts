/**
 * One-time Stripe setup for The Chair's subscription billing.
 *
 * Creates a Product + monthly recurring Price for each paid plan and prints the
 * Price ids to paste into your environment. Idempotent — each Price carries a
 * stable `lookup_key`, so re-running reuses the existing Price instead of making
 * duplicates.
 *
 * Usage:
 *   1. Put STRIPE_SECRET_KEY in your .env (use your TEST key, sk_test_…).
 *   2. Run:  npm run stripe:setup
 *   3. Copy the printed STRIPE_PRICE_* lines into .env (and Railway).
 */
import Stripe from "stripe";

// Load .env for this standalone script (Node 20.12+).
try {
  process.loadEnvFile(".env");
} catch {
  /* .env optional if the vars are already exported */
}

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY is not set. Add it to .env (use your test key) and re-run.");
  process.exit(1);
}

const stripe = new Stripe(key);

// Keep these in sync with lib/plans.ts (label + monthly price in cents).
const PLANS = [
  { key: "TEAM", name: "The Chair — Team", cents: 4900, envVar: "STRIPE_PRICE_TEAM" },
  { key: "BARBERSHOP", name: "The Chair — Barbershop", cents: 12900, envVar: "STRIPE_PRICE_BARBERSHOP" },
];

const live = key.startsWith("sk_live_");
console.log(`\n→ Creating subscription prices in Stripe (${live ? "LIVE" : "test"} mode)…\n`);

try {
  const out: string[] = [];
  for (const p of PLANS) {
    const lookupKey = `chair_${p.key.toLowerCase()}_monthly`;

    // Reuse an existing Price with this lookup key if present.
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    let price = existing.data[0];

    if (!price) {
      const product = await stripe.products.create({
        name: p.name,
        metadata: { plan: p.key },
      });
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.cents,
        currency: "usd",
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        metadata: { plan: p.key },
      });
      console.log(`  created ${p.name}: ${price.id}`);
    } else {
      console.log(`  reused  ${p.name}: ${price.id}`);
    }
    out.push(`${p.envVar}="${price.id}"`);
  }

  console.log("\n✓ Done. Add these to your .env (and Railway variables):\n");
  out.forEach((l) => console.log(l));
  console.log("\nNext: add a webhook (Developers → Webhooks) to /api/stripe/webhook for");
  console.log("checkout.session.completed, customer.subscription.*, invoice.payment_failed,");
  console.log("and put its signing secret in STRIPE_WEBHOOK_SECRET.\n");
  process.exit(0);
} catch (err) {
  console.error("\n✗ Stripe setup failed:", err instanceof Error ? err.message : err);
  console.error("Check that STRIPE_SECRET_KEY is valid.\n");
  process.exit(1);
}
