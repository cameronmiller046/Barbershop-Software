/**
 * One-time Square setup for The Chair's subscription billing.
 *
 * Creates the subscription PLANS + monthly VARIATIONS in your Square catalog and
 * prints the variation ids to paste into your environment. It is idempotent — a
 * stable idempotency key means re-running returns the same ids instead of
 * creating duplicates.
 *
 * Usage:
 *   1. Put SQUARE_ACCESS_TOKEN (+ optional SQUARE_ENVIRONMENT=sandbox|production)
 *      in your .env — use your SANDBOX access token to start.
 *   2. Run:  npm run square:setup
 *   3. Copy the printed SQUARE_PLAN_VARIATION_* lines into .env (and Railway).
 */
import { SquareClient, SquareEnvironment } from "square";

// Load .env for this standalone script (Node 20.12+).
try {
  process.loadEnvFile(".env");
} catch {
  /* .env optional if the vars are already exported */
}

const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
const environment =
  process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

if (!token) {
  console.error("✗ SQUARE_ACCESS_TOKEN is not set. Add it to .env (use your sandbox token) and re-run.");
  process.exit(1);
}

// Keep these in sync with lib/plans.ts (label + monthly price in cents).
const PLANS = [
  { key: "TEAM", name: "The Chair — Team", cents: 4900, envVar: "SQUARE_PLAN_VARIATION_TEAM" },
  { key: "BARBERSHOP", name: "The Chair — Barbershop", cents: 12900, envVar: "SQUARE_PLAN_VARIATION_BARBERSHOP" },
];

const client = new SquareClient({ token, environment });

const objects = PLANS.map((p) => ({
  type: "SUBSCRIPTION_PLAN" as const,
  id: `#plan-${p.key}`,
  subscriptionPlanData: {
    name: p.name,
    subscriptionPlanVariations: [
      {
        type: "SUBSCRIPTION_PLAN_VARIATION" as const,
        id: `#var-${p.key}`,
        subscriptionPlanVariationData: {
          name: "Monthly",
          phases: [
            {
              cadence: "MONTHLY" as const,
              ordinal: BigInt(0),
              recurringPriceMoney: { amount: BigInt(p.cents), currency: "USD" as const },
            },
          ],
        },
      },
    ],
  },
}));

console.log(`\n→ Creating subscription plans in Square (${environment})…\n`);

try {
  const res = await client.catalog.batchUpsert({
    idempotencyKey: "the-chair-subscription-plans-v1",
    batches: [{ objects }],
  });

  const mappings = res.idMappings ?? [];
  const idFor = (clientId: string) => mappings.find((m) => m.clientObjectId === clientId)?.objectId;

  console.log("✓ Done. Add these to your .env (and Railway variables):\n");
  let missing = false;
  for (const p of PLANS) {
    const id = idFor(`#var-${p.key}`);
    if (id) {
      console.log(`${p.envVar}="${id}"`);
    } else {
      missing = true;
      console.log(`# ${p.envVar} — could not resolve variation id for ${p.key}`);
    }
  }
  console.log("\nNext: set SQUARE_LOCATION_ID, add a webhook (URL /api/square/webhook,");
  console.log("events subscription.created/updated + invoice.payment_made) and put its");
  console.log("signature key in SQUARE_WEBHOOK_SIGNATURE_KEY.\n");
  process.exit(missing ? 1 : 0);
} catch (err) {
  console.error("\n✗ Square setup failed:", err instanceof Error ? err.message : err);
  console.error("Check that SQUARE_ACCESS_TOKEN is valid for the selected environment.\n");
  process.exit(1);
}
