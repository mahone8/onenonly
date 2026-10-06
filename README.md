# ONE N ONLY — E-commerce Store

Premium accessories store (caps, wallets, bracelets, glasses, watches) based
in Faisalabad, Pakistan. Cash on Delivery nationwide. Built with Next.js 16,
Neon PostgreSQL (Prisma), Tailwind 4 and shadcn/ui.

---

## 1. Environment variables

All secrets live in `.env` (local) or your host's environment settings
(production). **Nothing is hardcoded in the source.**

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres **pooler** connection string (`?sslmode=require&pgbouncer=true`) |
| `DIRECT_DATABASE_URL` | ✅ | Neon **direct** connection string (used by migrations/DDL) |
| `ADMIN_SECRET` | ✅ | Random 32+ char string signing session cookies — `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | ⚠️ | Bootstrap password that claims the first admin account at `/admin`. Remove after first login. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Your production URL, e.g. `https://onenonly.pk` (used in emails + sitemap) |
| `RESEND_API_KEY` | optional | Sends verification emails via Resend. Unset = link printed to server logs. |
| `MAIL_FROM` | optional | From-address for verification emails, e.g. `"One N Only <no-reply@yourdomain>"` |

Example `.env`:

```
DATABASE_URL=postgresql://USER:PASS@ep-xxx-pooler.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=10
DIRECT_DATABASE_URL=postgresql://USER:PASS@ep-xxx.aws.neon.tech/neondb?sslmode=require
ADMIN_SECRET=<openssl rand -hex 32>
ADMIN_PASSWORD=choose-a-strong-temp-password
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 2. Deploy (Vercel + Neon, ~10 minutes)

1. Push this repository to GitHub.
2. Create the project on [vercel.com](https://vercel.com) → import the repo.
3. Add every environment variable above in **Settings → Environment Variables**.
4. Deploy. The Neon database is already live — no database setup needed.
5. Point your custom domain (Settings → Domains). HTTPS is automatic on
   Vercel; HSTS headers are already sent by the app.

### First-run store setup

1. Visit `https://yourdomain.com/admin`
2. Sign in with **any email + the `ADMIN_PASSWORD` from env** — that account
   becomes the admin (bcrypt-hashed in the database).
3. Change the password (My Account on the storefront after admin login is
   separate — the admin password change is done by editing the admin user in
   the DB or keeping a strong `ADMIN_PASSWORD`).
4. **Delete `ADMIN_PASSWORD` from your env vars** afterwards.
5. Add products (Admin → Add product) or bulk-import (below).

## 3. Database commands

```bash
bun run db:push        # sync Prisma schema to Neon
bun run db:generate    # regenerate the Prisma client after schema edits
bun scripts/setup-db.mjs    # seed the 5 store categories (idempotent)
```

## 4. Importing your products

**Option A — Admin UI (JSON):** Admin → Export gives the format; Admin →
Import loads it back (drag & drop or paste). Existing slugs update in place.

**Option B — Script (CSV or JSON):**

```bash
node scripts/import-products.mjs my-products.csv          # upsert by slug
node scripts/import-products.mjs my-products.json         # upsert by slug
node scripts/import-products.mjs my-products.csv --replace  # wipe & import
```

CSV headers: `name, category, price, description, image` and optionally
`comparePrice, brand, strap, caseSize, stock, featured, badge, images`
(gallery URLs joined with `|`). Categories must exist: caps, wallets,
bracelets, glasses, watches.

## 5. Architecture notes

- **Auth** — customers: phone/email + bcrypt password, signed httpOnly
  session cookie (7 days). Admin: same scheme with `role="admin"`, role
  re-verified against the database on every admin request.
- **Rate limits** — login 8/10 min/IP, signup 5/hour/IP, admin login
  5/10 min/IP, reviews 5/10 min/IP (in-memory; use Redis if you scale
  horizontally).
- **Orders** — prices/stock recalculated server-side; stock decremented
  atomically; promo codes revalidated server-side; cancelling an order in
  the admin restocks it.
- **Reviews** — submitted publicly, aggregated into product rating/count,
  deletable from the admin (aggregation decrements).
- **Live order counter** — `/api/orders/pulse` returns a real count of
  orders in the last 30 minutes; hidden when zero. Never faked.
- **Uploads** — `/api/upload` (admin-only) stores files under
  `public/uploads/`. On serverless hosts these are ephemeral — prefer
  http(s) image URLs, or move uploads to Vercel Blob/S3 for persistence.
- **Email verification** — token flow in place; set `RESEND_API_KEY` to
  deliver the emails. Without it the link is logged to the console.

## 6. Security checklist

- [x] Passwords bcrypt-hashed (12 rounds)
- [x] httpOnly, SameSite=Lax, Secure (prod) session cookies
- [x] Server-side role checks on every admin route & API
- [x] Rate limiting on login/signup/reviews
- [x] `/admin` noindex + `X-Robots-Tag: noindex` header
- [x] No admin links anywhere in the public UI
- [x] Security headers (HSTS, nosniff, frame options, referrer policy)
- [x] Honeypot spam trap on signup
- [x] Secrets only from environment variables
- [ ] Set `NEXT_PUBLIC_SITE_URL` in production
- [ ] Set `RESEND_API_KEY` in production
- [ ] Remove `ADMIN_PASSWORD` after claiming the admin account

## 7. Local development

```bash
bun install
bun run dev        # http://localhost:3000
bun run lint       # eslint
```
