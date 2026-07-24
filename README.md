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

### Self-serve signup & billing (Square)
Shop owners sign up themselves at **`/signup`** (the marketing/pricing CTAs point
here). They pick a plan and:
- **Solo (free)** → shop is provisioned and live immediately; owner lands in `/portal`.
- **Team / Barbershop (paid)** → shop is created `PENDING`, then the owner is sent
  to **Square-hosted checkout**. Square charges the card and calls our webhook,
  which flips the shop to `ACTIVE`. No card data ever touches this app.
- **Enterprise** → routes to `/contact` (sales).

Until a paid shop's subscription is `ACTIVE`, the portal funnels the owner to
`/portal/billing` to finish checkout. Plans/limits live in `src/lib/plans.ts`
(single source of truth); the Square integration is in `src/lib/square.ts` and
the webhook at `src/app/api/square/webhook`.

The older invite-style `/beta` apply-and-approve flow still exists but is no
longer the front door.

#### One-time Square setup
1. In the [Square Developer Dashboard](https://developer.squareup.com/apps),
   open (or create) your app and copy the **Sandbox Access Token**, then find your
   **Location ID**.
2. Put `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, and `SQUARE_ENVIRONMENT=sandbox`
   in `.env`.
3. Create the subscription plans + monthly variations:
   ```bash
   npm run square:setup
   ```
   Paste the printed `SQUARE_PLAN_VARIATION_TEAM` / `SQUARE_PLAN_VARIATION_BARBERSHOP`
   lines into `.env`.
4. Add a **webhook** (Developer Dashboard → your app → Webhooks) pointing to
   `https://<your-app>/api/square/webhook`, subscribe to `subscription.created`,
   `subscription.updated`, and `invoice.payment_made`, and put its **signature
   key** in `SQUARE_WEBHOOK_SIGNATURE_KEY`.
5. Test with a [sandbox test card](https://developer.squareup.com/docs/devtools/sandbox/payments)
   (e.g. `4111 1111 1111 1111`). Flip `SQUARE_ENVIRONMENT=production` and swap in
   production credentials when you go live.

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

Default seeded logins:
- **Superadmin** → `cameronmiller046@gmail.com` / `Ieokkyz7` → `/admin`
  (override via env before seeding)
- **Demo shop portal (Standard user / barber)** → `Admin123` / `Admin123` → `/portal`.
  A barber of the demo shop "Professional Barbershop & Salon" — the account behind the
  storefront's "Powered by The Chair" footer link, for demoing the shop portal.

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
