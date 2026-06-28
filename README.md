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

**Demo tenant:** `Professional Barbershop` at `/t/professional-barbershop` — runs
on the exact same codebase as every other tenant.

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

### Deferred (scaffolded, not wired)
- **Phase 6 — Billing & subscriptions** (Stripe). Plans/flags exist on `Tenant`.
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

Default seeded logins:
- **Platform admin** → `cameronmiller046@gmail.com` / `Ieokkz7` → `/admin`
  (override via env before seeding)
- **Demo shop portal (barber)** → `Admin123` / `Admin123` → `/portal`. This is a
  BARBER of the demo shop "Professional Barbershop & Salon" — it's the account
  behind the storefront's "Powered by The Chair" footer link, for demoing the
  shop-management portal.

The demo shop (`/t/professional-barbershop`) is **public** — anyone can browse and
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
