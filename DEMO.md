# Demo run-sheet

Quick reference for presenting the three account types. All accounts come from
`prisma/seed.ts` + the in-app **"✨ Try the demo"** button (`src/lib/demo.ts`).

## Setup (once)

```bash
npm install
npm run db:push        # create tables (needs DATABASE_URL set)
npm run db:seed        # superadmin + flagship store (clean baseline)
npm run dev            # http://localhost:3000
```

After `db:seed`, the three logins below **already work** — `test1`/`test2` are
permanent flagship accounts that survive "Clear demo data".

To make the dashboards and Reports look full, sign in as the **Superadmin** and
click **"✨ Try the demo"** (top-left of `/admin`): this loads appointments for
both staff, 8 extra stores, beta applications, and the activity feed. "Clear
demo data" resets to baseline but keeps `test1`/`test2` loginable.

## The three account types

| Role | Sign in at `/login` | Password | What it demonstrates |
|------|---------------------|----------|----------------------|
| **Superadmin** (platform) | `cameronmiller046@gmail.com` | `Ieokkyz7` | Runs the whole platform: every store, all user accounts, beta applications, activity feed. → lands on `/admin` |
| **Manager** (runs a shop) | `test1` | `test1` | Whole-shop view — every barber's schedule, combined revenue, staff, services, branding & settings. → lands on `/portal` |
| **Barber** (staff) | `test2` | `test2` | Scoped view — only their **own** book; no whole-shop revenue, team, or settings. → lands on `/portal` |

> The two presentation accounts use dead-simple logins — **`test1`/`test1`**
> (Manager) and **`test2`/`test2`** (Barber); the password is the same as the
> username. The 8 background demo stores use `demo1234`. The login field accepts
> a username or an email, so `test1`/`test2` work fine.

## Suggested flow for the role contrast

1. **Superadmin** → `/admin`: show stores, users, applications, then "Try the demo".
2. **Manager** (`test1`) → `/portal`: dashboard shows **both** Marcus's and
   Devon's appointments today + this week's combined revenue. Open **Reports**
   for projected earnings (next 30 days / this week / all upcoming) with a
   per-barber breakdown. Show Team, Services, Settings — full control.
3. **Barber** (`test2`) → `/portal`: same dashboard now shows **only Devon's**
   appointments, no shop-wide revenue, and the Reports/Team/Settings nav items
   are gone.

The flagship store's public booking site is at `/t/professional-barbershop`.

## Demo identities

- **Marcus Reed** — Manager (`OWNER`), login `test1`
- **Devon Carter** — Barber (`BARBER`), login `test2`
</content>
