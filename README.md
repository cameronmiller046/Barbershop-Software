# The Chair — Multi-Tenant Barbershop SaaS

A production-ready, multi-tenant booking platform for appointment-based
businesses, starting with barbershops. One codebase serves a public marketing
site **and** an unlimited number of branded tenant shops, each with its own
website and role-based management portal.

Built per the **Multi-Tenant Barbershop SaaS PRD**.

## What's included (Phases 1–5)

| Area | Routes |
| --- | --- |
| Marketing site | `/`, `/features`, `/pricing`, `/about`, `/contact`, `/beta` |
| Closed-beta workflow | apply at `/beta` → admin approves → tenant auto-provisioned |
| Tenant website | `/t/<slug>` + `/services` `/team` `/gallery` `/reviews` `/faq` `/contact` |
| Booking | `/t/<slug>/book`, manage via `/t/<slug>/appointments/<token>` |
| Barber portal | `/portal` — dashboard, appointments, clients, services, social planner, team, settings |
| Platform admin | `/admin` — overview, beta applications, tenants, feature flags |

**Demo tenant:** `Demo Store` at `/t/demo-store` — a dedicated `isDemo` tenant
(so demo reseeds never touch real stores) that runs on the exact same codebase
as every other tenant.

### Architecture highlights
- **Tenant isolation:** every business record carries `tenantId`; all queries
  are scoped, and public/portal/admin layers re-validate ownership.
- **RBAC:** `PLATFORM_ADMIN`, `OWNER`, `BARBER`, `RECEPTIONIST`, `CUSTOMER`
  (customers self-serve via a secure manage link). See `src/lib/rbac.ts`.
- **Security:** audit logs (`src/lib/audit.ts`), rate limiting
  (`src/lib/ratelimit.ts`), Zod validation on every public endpoint, bcrypt
  password hashing.
- **Generic core models** (`Service`, `User`/staff, `Appointment`, `Client`) so
  the platform can later support salons, spas, tattoo studios, etc.

### Self-serve signup & billing (Stripe)
Shop owners sign up themselves at **`/signup`** (the marketing/pricing CTAs point
here). They pick a plan and:
- **Solo (free)** → shop is provisioned and live immediately; owner lands in `/portal`.
- **Team / Barbershop (paid)** → shop is created `PENDING`, then the owner confirms
  their subscription on our **own page via the Stripe Payment Element**
  (`/signup/pay`, styled to the lux theme — no redirect to stripe.com). Immediate
  charges confirm a PaymentIntent (`latest_invoice.confirmation_secret`); trial
  plans confirm a SetupIntent (`pending_setup_intent`). Card fields are
  Stripe-hosted iframes, so no card data ever touches this app.
- **Enterprise** → routes to `/contact` (sales).

Until a paid shop's subscription is live (`ACTIVE`/`TRIALING`), the portal funnels
the owner to `/portal/billing` to finish checkout. That page also opens the Stripe
**Customer Portal** so owners can update their card or cancel. Plans/limits live in
`src/lib/plans.ts` (single source of truth); the Stripe integration is in
`src/lib/stripe.ts` + `src/lib/billing.ts` and the webhook at
`src/app/api/stripe/webhook`.

The `tenantId` is carried in Checkout/Subscription **metadata**, so webhooks map
back to the shop with no email guessing.

The older invite-style `/beta` apply-and-approve flow still exists but is no
longer the front door.

#### One-time Stripe setup
1. In the [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (Test mode),
   copy your **Secret key** (`sk_test_…`) into `STRIPE_SECRET_KEY` in `.env`.
2. Create the products + monthly prices:
   ```bash
   npm run stripe:setup
   ```
   Paste the printed `STRIPE_PRICE_TEAM` / `STRIPE_PRICE_BARBERSHOP` lines into `.env`.
3. Add a **webhook** (Developers → Webhooks → `https://<your-app>/api/stripe/webhook`)
   for `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`, and
   `invoice.payment_failed`; put its **signing secret** (`whsec_…`) in
   `STRIPE_WEBHOOK_SECRET`. For local testing, `stripe listen --forward-to
   localhost:3000/api/stripe/webhook` prints a `whsec_…` to use.
4. Test with card `4242 4242 4242 4242` (any future expiry / CVC). Swap in your
   **live** key + a live webhook when you go to production.

### Deferred (scaffolded, not wired)
- **Metered per-barber seats** — paid plans currently hard-cap chairs at their
  included seat count; billing for extra seats is future work.
- **Phase 7 — AI tools & integrations** (e.g. caption generation, live social
  posting). The social planner is built; live publishing is future work.

## Local development

```bash
cp .env.example .env        # then fill DATABASE_URL + AUTH_SECRET
npm install
npm run db:push             # create tables (or `prisma migrate dev`)
npm run db:seed             # platform admin + demo tenant
npm run dev
```

### Roles (hierarchy)
- **Superadmin** (internal role `PLATFORM_ADMIN`) — manages every store and every
  user account; onboards/sells stores. Console at `/admin` (Stores, Users,
  Applications, Roles).
- **Admin** (role `OWNER`) — a shop owner; manages their own shop, staff, and settings.
- **Standard user** (role `BARBER` / `RECEPTIONIST`) — front-of-chair staff.

Levels are assigned in the Superadmin **Users** console (`/admin/users`); capabilities
are enforced in `src/lib/rbac.ts` and described at `/admin/roles`.

Seeded login:
- **Superadmin** → email from `PLATFORM_ADMIN_EMAIL`, password from
  `PLATFORM_ADMIN_PASSWORD` → `/admin`. Both are **required** in the environment
  before seeding — the seed refuses to run without a strong password (no default
  is shipped). Rotate the password after first login.
- **Demo shop portal (Standard user / barber)** → `Admin123` / `Admin123` → `/portal`
  (a barber of the demo shop, for demoing the shop portal).

The demo shop (`/t/demo-store`) is **public** — anyone can browse and
book without logging in.

## Deploy to Railway

1. **Create a project** and add a **PostgreSQL** plugin. Railway injects
   `DATABASE_URL` automatically.
2. **Add the service** from this GitHub repo. Railway detects Next.js (Nixpacks).
3. **Set environment variables** (Service → Variables):
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `NEXT_PUBLIC_APP_URL` — your Railway URL, e.g. `https://yourapp.up.railway.app`
   - *(optional)* `RESEND_API_KEY`, `EMAIL_FROM` — real emails; otherwise emails
     are logged to the server console.
4. **Build & start** are already configured:
   - Build: `prisma generate && next build`
   - Start: `prisma migrate deploy && next start` (respects Railway's `$PORT`)
   - Migrations run at **start**, not build — Railway's private database network
     (`*.railway.internal`) is only reachable at runtime, so running
     `migrate deploy` during the build fails to connect. See `railway.json`.
5. **Seed once** after the first deploy (Railway shell or a one-off command):
   ```bash
   npm run db:seed
   ```

> Migrations: generate them locally with `npx prisma migrate dev --name init`
> and commit the `prisma/migrations` folder so `migrate deploy` runs them in
> production. For a quick first deploy you can instead run `npx prisma db push`.

## Tenant routing

Tenants are served at `/t/<slug>` so the platform works on Railway with **no
DNS setup**. Subdomain routing (`<slug>.yourdomain.com`) can be layered on later
in `src/middleware.ts` without touching the data model.
