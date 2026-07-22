# PRD — Fasteno Shyama

**Premium men's formal accessories e-commerce store**
Version 1.0 · 16 July 2026 · Status: Approved for build

---

## 1. Overview

Fasteno Shyama is a direct-to-consumer e-commerce store selling premium men's formal accessories in India:

| Category | Examples |
|---|---|
| Ties | Formal solids, striped (repp), textured weaves |
| Cufflinks | Classic metal, enamel, stone-set |
| Brooches / Lapel pins | Wedding & sherwani brooches, minimal lapel pins |
| Pocket Squares | Silk solids, printed, contrast-border |
| Buttons | Premium blazer/kurta button sets |
| Gift Sets | Coordinated tie + pocket square + cufflinks boxes |

**Positioning:** "The finishing touch." Curated, gift-worthy, occasion-driven (weddings, interviews, festive) — priced between mass marketplaces (Amazon/Myntra) and luxury imports (Drake's/Brioni).

**Market:** India · Currency: INR (₹) · Payments: Razorpay (UPI, cards, netbanking, wallets) + Cash on Delivery.

---

## 2. Competitive research

### International benchmarks
| Brand | Tier | What we borrow |
|---|---|---|
| **Drake's** (drakes.com) | Luxury ($165–225 ties) | Editorial storytelling, craft/material details on PDP, heritage tone |
| **The Tie Bar** (thetiebar.com) | Value ($18–25) | Clean grid, powerful color/pattern filters, "shop by occasion", bundles |
| **OTAA** (otaa.com) | Mid ($40–60) | Coordinated ecosystem — matching tie + square + cufflinks, bold PDP imagery |
| **The Dark Knot / Cufflinks.com** | Mid | DTC value messaging, huge cufflink taxonomy (material, motif) |
| **Suitsupply / Brioni** | Premium | Restrained typography, whitespace, muted palettes |

### India benchmarks
| Brand | What we borrow |
|---|---|
| **Peluche.in** | 2000+ SKU breadth, gift packaging emphasis, semi-precious stone story |
| **The Tie Hub** | Curated accessory sets as "finishing statements", brass-quality messaging |
| **The Boqor** | Personalization/gifting angle, ₹1,700–2,550 sweet spot |
| **French Crown** | Accessories as an arm of formal menswear, steel/sterling plating details |
| **Myntra/Amazon** | Table stakes: COD, free shipping threshold, easy returns |

### Patterns every premium player shares (→ our requirements)
1. Category-first navigation with large imagery.
2. Product cards: image, name, price, quick hover state; no clutter.
3. PDP with material/craft details, styling notes, and "complete the look" cross-sells.
4. Occasion & gifting merchandising (wedding, office, festive).
5. Trust bar: free shipping threshold, COD, returns, secure payment.
6. Muted, editorial design; serif display type; restrained gold/navy/burgundy accents.

---

## 3. Goals & non-goals

### Goals (v1)
- G1: A complete, deployable storefront: browse → filter → product → cart → checkout → order.
- G2: Razorpay payments (+ COD) with server-side verification.
- G3: Customer accounts: auth, order history, addresses, wishlist.
- G4: Admin panel: manage products, view orders, update order status.
- G5: Premium "dark luxury" brand experience, fully responsive, SEO-ready.
- G6: Runs in **demo mode** (bundled seed data, simulated payment) with zero configuration, and switches to **live mode** when Supabase + Razorpay env vars are set.

### Non-goals (v1)
- Multi-currency / international shipping.
- Product reviews & ratings (v2).
- Discount coupons engine (v2 — schema reserves space).
- Real-time inventory sync with external systems.
- Native mobile app.

---

## 4. Users & key journeys

| Persona | Journey |
|---|---|
| **Groom/wedding shopper** | Lands on home → Wedding edit → brooch + gift set → COD checkout |
| **Office professional** | Shop ties → filter: formal, navy, under ₹2,000 → UPI checkout |
| **Gift buyer** | Gift Sets → PDP with gift-box note → pays via card |
| **Returning customer** | Login → wishlist → moves item to cart → saved address checkout |
| **Store owner (admin)** | Login → admin → add product, mark order shipped |

---

## 5. Functional requirements

### 5.1 Storefront
- **Home:** hero (brand statement), category tiles (6), featured products, "shop by occasion" strip, craftsmanship/USP band, trust bar, newsletter capture (UI), footer.
- **Static pages:** About, Contact (form UI), FAQ, Shipping & Returns, Privacy, Terms.

### 5.2 Catalog
- **/shop** — all products; **/shop/[category]** — per category.
- Filters: category, color, material, pattern (solid/striped/textured/printed), price range. Sort: featured, newest, price ↑/↓. URL-driven (shareable).
- **Product page /product/[slug]:** image gallery, name, price + compare-at (sale), description, material/craft details, quantity selector, Add to Cart, Add to Wishlist, delivery/returns notes, "Complete the look" (related products), breadcrumbs.
- **Search /search?q=** — name/description/tag matching.

### 5.3 Cart & checkout
- Cart persists in localStorage (guest) — page with line items, qty edit, remove, subtotal, free-shipping progress (free ≥ ₹1,499, else ₹99).
- Checkout (guest allowed): contact + shipping address → payment method (Razorpay | COD) → place order.
- **Razorpay flow:** server creates order (amount in paise) → Razorpay JS checkout opens → server verifies payment signature (HMAC) → order marked paid.
- **Demo mode:** simulated payment step, order stored locally; clearly labelled.
- Order confirmation page with order number and summary.

### 5.4 Accounts (Supabase Auth)
- Email/password sign-up & login (Google OAuth ready, config-gated).
- Account area: profile, order history with status, saved addresses (CRUD), wishlist.

### 5.5 Admin (role-gated: `profiles.role = 'admin'`)
- Dashboard: revenue, order count, low-stock summary.
- Products: list, create, edit, archive; stock & featured toggles.
- Orders: list, detail, update status (pending → confirmed → shipped → delivered / cancelled).

### 5.6 Modes
| Capability | Demo mode (no env) | Live mode (env set) |
|---|---|---|
| Catalog | Bundled seed data | Supabase `products` |
| Cart | localStorage | localStorage |
| Checkout | Simulated payment | Razorpay + COD |
| Orders | localStorage (demo banner) | Supabase `orders` |
| Auth/account/admin | Sign-in disabled w/ notice | Supabase Auth |

---

## 6. Technical architecture

| Layer | Choice |
|---|---|
| Framework | **Next.js 15** (App Router, React 19, TypeScript) |
| Styling | **Tailwind CSS v4** + design tokens; `next/font` (Playfair Display + Inter) |
| Icons | lucide-react |
| Backend | **Supabase** — Postgres, Auth, Row Level Security |
| Payments | **Razorpay** (orders API + signature verification) |
| Hosting | **Vercel** (frontend + API routes) |
| State | React Context (cart, wishlist) + localStorage; server components for data |

### Data model (Postgres)
```
categories   id, slug, name, description, sort_order
products     id, slug, name, category_id, price (paise), compare_at_price,
             description, details jsonb, material, color, pattern, tags text[],
             images text[], stock, featured, active, created_at
profiles     id (auth.users FK), full_name, phone, role ('customer'|'admin')
addresses    id, user_id, name, phone, line1, line2, city, state, pincode, is_default
orders       id, order_number, user_id (nullable = guest), email, phone,
             shipping_address jsonb, subtotal, shipping_fee, total (paise),
             payment_method ('razorpay'|'cod'|'demo'), payment_status,
             razorpay_order_id, razorpay_payment_id, status, created_at
order_items  id, order_id, product_id, name, price, quantity, image
wishlists    user_id, product_id, created_at
```

### Security
- RLS on all tables: public read for active products/categories; owners read their orders/addresses/wishlists; admin policies via `profiles.role`.
- Razorpay secret used only server-side; payment verified by HMAC-SHA256 signature check.
- Service-role key never exposed to the client.
- Admin routes guarded server-side (middleware + layout check).

### SEO & performance
- Server-rendered pages, per-page metadata, Open Graph tags, semantic HTML.
- `sitemap.xml` + `robots.txt` generated.
- SVG product imagery (crisp, tiny payloads); lazy loading; Lighthouse ≥ 90 target.

---

## 7. Design system — "Dark Luxury"

| Token | Value |
|---|---|
| Background | Charcoal `#0F0F11`, raised surface `#17171A`, card `#1C1C20` |
| Text | Ivory `#F4EFE6`, muted `#A8A29A` |
| Accent | Gold `#C6A75E` (hover `#D9BC77`), hairlines `#2A2A2F` |
| Display font | Playfair Display (serif) — headlines, prices |
| Body font | Inter — UI, body copy |
| Feel | Generous whitespace, thin gold hairline borders, uppercase letter-spaced eyebrows, subtle hover lift on cards, no loud gradients |

Product imagery: consistent generated SVG art per product (tie/cufflink/brooch/square/button illustrations on dark fabric-toned backdrops) — uniform, premium, zero licensing risk; replaceable later with photography via Supabase Storage.

---

## 8. Pages inventory

```
/                     Home
/shop                 All products (+filters/sort)
/shop/[category]      Category listing
/product/[slug]       Product detail
/search               Search results
/cart                 Cart
/checkout             Checkout
/order/[id]           Order confirmation
/login /register      Auth
/account              Profile overview
/account/orders       Order history
/account/addresses    Address book
/account/wishlist     Wishlist
/admin                Dashboard
/admin/products(+new/[id])  Product management
/admin/orders(/[id])  Order management
/about /contact /faq /shipping-returns /privacy /terms
```

---

## 9. Success metrics (post-launch)
- Checkout conversion ≥ 1.5% of sessions; cart abandonment < 75%.
- Payment success rate ≥ 95% (Razorpay dashboard).
- LCP < 2.5s on 4G; zero RLS security findings.

## 10. Milestones
1. **M1 — Foundation:** scaffold, design tokens, data layer, seed catalog, SQL migrations. ✅ this session
2. **M2 — Parallel build:** storefront, catalog, checkout, accounts/admin (4 sub-agents). ⏳ awaiting go-ahead
3. **M3 — Integration:** build passes, browser-verified flows, README + deploy guide.
4. **M4 — Launch (user):** create Supabase project, run SQL, add env vars, deploy to Vercel, Razorpay live keys.
