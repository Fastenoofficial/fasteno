# Agentic Build Plan — Fasteno Shyama

How the site gets built in one go: a **foundation phase** (lead agent) followed by **4 parallel sub-agents** with strict, non-overlapping file ownership, then an **integration phase** (lead agent). Parallel agents never edit shared files — they only consume contracts the foundation defines.

---

## Phase 0 — Foundation (lead agent, sequential — DONE before agents launch)

Everything every agent depends on:

| Area | Files |
|---|---|
| Project config | `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example` |
| Theme | `app/globals.css` (Tailwind v4 tokens: charcoal/gold/ivory, fonts) |
| Shell | `app/layout.tsx`, `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`, `components/layout/TrustBar.tsx`, `app/not-found.tsx` |
| Shared UI | `components/ui/` — Button, Input, Select, Badge, QuantityStepper, SectionHeading, EmptyState, ProductCard, PriceTag |
| Types & contracts | `lib/types.ts` (Product, Category, CartItem, Order, Address, …) |
| Data layer | `lib/catalog.ts` (getProducts/getProductBySlug/getCategories/… — Supabase when configured, bundled seed otherwise), `lib/seed-data.ts`, `lib/config.ts` (mode detection), `lib/format.ts` (₹ paise formatting) |
| Client state | `lib/cart-context.tsx` (cart + wishlist providers, localStorage) |
| Supabase | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts` (session refresh), `supabase/migrations/001_schema.sql` (tables + RLS), `supabase/seed.sql` |
| Imagery | `scripts/generate-images.mjs` → `public/products/*.svg` (one per SKU) + brand marks |

**Contract rule:** parallel agents import from `lib/*` and `components/ui/*` but NEVER modify them, `app/layout.tsx`, `app/globals.css`, or another agent's directories.

---

## Phase 1 — Parallel sub-agents (launched together after user approval)

### Agent A — Storefront
**Owns:** `app/page.tsx`, `app/about/`, `app/contact/`, `app/faq/`, `app/shipping-returns/`, `app/privacy/`, `app/terms/`, `components/home/`
Home page (hero, category tiles, featured products via `getFeaturedProducts()`, occasion strip, craftsmanship band, newsletter UI) + all static/policy pages.

### Agent B — Catalog
**Owns:** `app/shop/`, `app/product/`, `app/search/`, `components/catalog/`
Listing with URL-driven filters (color/material/pattern/price) + sort, category pages, PDP (gallery, details, add-to-cart, related products), search.

### Agent C — Commerce
**Owns:** `app/cart/`, `app/checkout/`, `app/order/`, `app/api/checkout/`, `app/api/razorpay/`, `components/checkout/`, `lib/orders.ts`, `lib/razorpay.ts`
Cart page, checkout form (address → payment), Razorpay order creation + HMAC signature verification API routes, COD path, demo-mode simulated payment, order confirmation page.

### Agent D — Accounts & Admin
**Owns:** `app/(auth)/login/`, `app/(auth)/register/`, `app/account/`, `app/admin/`, `app/auth/` (callback), `components/account/`, `components/admin/`, `lib/auth.ts`
Supabase email/password auth, account area (profile, orders, addresses, wishlist), role-gated admin (dashboard stats, product CRUD, order status management), demo-mode notices.

**Every agent also:** exports page `metadata`, uses only design tokens (no ad-hoc colors), handles demo vs live mode via `lib/config.ts`, and returns a file list + notes on completion.

---

## Phase 2 — Integration (lead agent)

1. `npm run build` — fix type/import errors across agent boundaries.
2. Launch dev server in the preview browser; walk through: home → shop → filter → PDP → add to cart → checkout (demo payment) → confirmation; auth + admin behind env config.
3. `README.md` — local run, Supabase project setup (run migrations/seed SQL), Razorpay keys, Vercel deploy steps.
4. Final report to user.

## Risk controls
- File-ownership matrix above prevents merge conflicts between parallel agents.
- Foundation compiles green before agents start, so agent errors are isolated to their own areas.
- Demo mode guarantees the site is runnable/verifiable without any external accounts.
