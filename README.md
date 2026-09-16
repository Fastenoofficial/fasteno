# Fasteno

Premium men's formal accessories — ties, cufflinks, brooches, pocket squares,
buttons and gift sets — built for the Indian market (INR, Razorpay, Cash on
Delivery).

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (Postgres + Auth + RLS) · Razorpay · Vercel.

---

## Demo mode vs live mode

The site **always runs with zero configuration**:

| | Demo mode (no env vars) | Live mode |
|---|---|---|
| Catalog | Bundled seed data (31 products) | Supabase `products` table |
| Auth / accounts | Disabled (notice shown) | Supabase email + password |
| Checkout | Simulated payment, order saved in browser localStorage | Real orders in Supabase; Razorpay and/or COD |
| Admin panel | Notice shown | Full dashboard for `role='admin'` users |

Mode is detected automatically from environment variables (`lib/config.ts`):
setting the Supabase keys switches catalog/auth/orders live; adding Razorpay
keys enables the real payment widget. COD works in live mode without Razorpay.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000  (demo mode out of the box)
```

Production build:

```bash
npm run build
npm run start
```

Regenerate product artwork (writes `public/products/*.svg`):

```bash
npm run generate:images
```

---

## Going live

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor run, in order:
   - `supabase/migrations/001_schema.sql` (tables, triggers, RLS policies)
   - `supabase/seed.sql` (categories + 31 products; idempotent)
3. Copy env vars from **Project Settings → API** into `.env.local`
   (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only; lets the Razorpay
     verification webhook mark orders paid (RLS restricts order updates to
     admins). Never expose it to the browser.
4. Register an account on the site, then make yourself admin
   (SQL Editor):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

   The admin panel is at `/admin`.

### 2. Razorpay (optional — COD works without it)

1. Create an account at [dashboard.razorpay.com](https://dashboard.razorpay.com)
   and generate API keys (**Account & Settings → API Keys**; use test keys
   first).
2. Add to `.env.local`:
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public, used by the checkout widget)
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (server-only)

Payments are verified server-side with an HMAC-SHA256 signature check
(`app/api/razorpay/verify`); order amounts are always re-priced from the
catalog on the server, never trusted from the client.

### 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo
   (framework auto-detected: Next.js).
3. Add all the environment variables above, plus
   `NEXT_PUBLIC_SITE_URL=https://your-domain.com`.
4. Deploy. Every push to the default branch redeploys automatically.

---

## Project structure

```
app/                 Pages (App Router) — storefront, shop, product, cart,
                     checkout, order, search, account, admin, auth, policies
app/api/checkout     Server-side cart validation + order creation (+ Razorpay order)
app/api/razorpay     Payment signature verification
components/ui        Design-system primitives (Button, ProductCard, PriceTag, …)
components/…         Feature components (home, catalog, checkout, account, admin)
lib/                 Types, config/mode detection, catalog data layer,
                     cart context, orders, razorpay, auth, formatting
supabase/            Schema migration + seed SQL
scripts/             SVG product-image generator
public/products      Generated product artwork (62 SVGs)
```

**Conventions:** all money is stored and computed as integer **paise** and
formatted with `formatINR`; server components by default with client islands
for interaction; design tokens only (defined in `app/globals.css`); secrets
never reach the client; database access is protected by row-level security.
