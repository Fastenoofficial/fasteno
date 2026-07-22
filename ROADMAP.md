# Fasteno Shyama — Competitive Gap Analysis & Feature Roadmap

> Produced 2026-07-17 from a 7-agent web research sweep: premium international
> brands (Drake's, The Tie Bar, OTAA, The Dark Knot, Cufflinks.com, Suitsupply,
> Hugo Boss), premium Indian stores (Peluche.in, The Tie Hub, French Crown,
> Myntra, Tata CLiQ Luxury, Aza Fashions, Bombay Shirt Company, Tossido),
> Baymard Institute / NN-g checkout research, Indian e-commerce law
> (Consumer Protection E-Commerce Rules 2020, DPDP Act 2023, GST, Legal
> Metrology), SEO standards, and retention-marketing practice.
> 127 raw findings; evidence from live competitor HTML.

## The headline insight

Fasteno's funnel plumbing (cart → checkout → orders → admin) already matches
mid-market competitors. The gap is **credibility assets and post-order
operations**: real photography, transactional email, inventory decrement,
GST/legal compliance, and tracking. Nothing else matters until those exist.

---

## A. MANDATORY — launch blockers (legal or trust-breaking)

### A1. The four absolute blockers (every competitor has all four)
| # | Feature | Why |
|---|---|---|
| 1 | **Real product photography** (flat-lay + texture macro + on-model + packaging per SKU; Tie Bar serves ~30 images/tie) | Nobody pays ₹1,000+ for silk they cannot see. SVG illustrations read as a fake store. Also gates Google Shopping listings. |
| 2 | **Transactional emails** (order confirmation, shipping confirmation) | No email after paying = fraud perception + "did my order go through?" support flood. |
| 3 | **Inventory decrement on order** + oversell prevention | Stock badges currently never change; overselling one-off stock forces cancelling paid orders. Decrement atomically in checkout transaction; restore on cancel. |
| 4 | **GST tax invoice per order** (PDF in account + admin) | Legally required for GST-registered sellers; corporate buyers need it for input credit. |

### A2. Legal compliance (Consumer Protection E-Commerce Rules 2020 / DPDP / Legal Metrology)
- **Grievance officer** name + designation + contact displayed prominently; 48h acknowledge / 30-day resolve SLA (Rule 4(4)-(5))
- **Legal entity name + registered address + phone** in footer/contact (Rule 4(2))
- **Country of origin** on every product listing + Legal Metrology declarations (MRP, net qty, manufacturer)
- **Price breakup** showing GST amount + delivery charges as single total with breakup (Rule 7(1)(e))
- **Complete returns disclosure**: who pays return shipping, refund timeline, exchange process (Rule 7(1)(a))
- **Payment info page**: methods, security, cancellation/refund procedure (Rule 7(1)(c))
- **DPDP Act 2023**: consent notice at each collection point, data-principal rights flow (penalties up to ₹250 crore)

### A3. Operational must-haves
- **Courier tracking** (Shiprocket/Delhivery AWB) — link in account + email. In COD-heavy India, no tracking = doorstep refusals (RTO). One Shiprocket integration also solves PIN serviceability, COD-by-pincode, reverse pickup.
- **Password reset / forgot-password flow** — currently missing entirely; locked-out customers are gone forever.
- **Razorpay server-side webhook reconciliation** — currently payment is only marked paid if the buyer's browser survives to POST back; webhook makes it reliable.
- **Refund execution** — admin can set "refunded" but nothing actually refunds via Razorpay API.
- **Security hardening**: rate limiting on /api/checkout + auth (bot COD-order flooding is a real Indian attack), security headers.
- **Analytics**: GA4 + Meta pixel + Microsoft Clarity (free). Zero analytics = flying blind.
- **SEO foundation**: Product/Offer JSON-LD on PDPs, sitemap.xml, robots.txt (disallow cart/checkout/account/admin), canonical URLs (filter params create duplicate-content permutations), raster 1200×630 OG images (SVG OG images don't render in WhatsApp — the #1 Indian share channel), Google Search Console + sitemap submission.

---

## B. RECOMMENDED — strong revenue/trust impact, standard on premium sites

### B1. Conversion & trust
- **Product reviews & ratings with photos** (+ AggregateRating schema → stars in Google). #1 social proof for an unknown brand. Post-delivery review-request email feeds it.
- **WhatsApp support** (wa.me float + number in footer) — default Indian support channel; also cuts COD RTO via order confirmation on WhatsApp.
- **PIN-code serviceability + delivery-date estimate on PDP** (Myntra/Tata CLiQ standard). Baymard: 21% abandon over unknown delivery time.
- **COD guardrails**: order-value cap (Peluche caps at ₹5,000), COD-by-pincode, OTP/WhatsApp confirmation of COD orders. COD RTO runs ~26% vs <2% prepaid (GoKwik).
- **Trust reinforcement at payment step** + dispatch SLA promise ("dispatched in 24h").
- **Size/fit + care guides**: tie width/length, belt sizing, "How to Tie a Tie", silk care. Cuts returns, wins long-tail SEO.
- **Address quality**: PIN → auto-fill city/state; numeric keyboards on mobile (`inputmode`); address validation.
- **Payment-failure retry**: keep order in "payment pending" with Retry Payment button (UPI failure rates at peak are real).
- **Search upgrades**: autocomplete, typo tolerance.

### B2. Revenue mechanics
- **Coupon/discount engine** — blocks welcome offer, Diwali/festive campaigns, influencer codes, win-back. Validate server-side at checkout.
- **Newsletter backend** (currently the form silently discards emails — worse than none, and no DPDP consent record). Supabase table minimum; Klaviyo/Brevo better. Pair with WELCOME10.
- **Multi-buy bundles** ("3 ties for ₹X", "complete the look": tie + pocket square + cufflinks). Standard AOV lift at Tie Bar/OTAA.
- **Gifting suite**: gift wrap + gift note at checkout, gift cards, curated gift boxes, **corporate gifting page** (B2B bulk = big Indian formal-accessories market).
- **Abandoned-cart recovery** (email/WhatsApp; ~70% of carts abandon; WhatsApp sees 90%+ open rates in India).
- **Back-in-stock alerts** on sold-out PDPs (currently that demand is thrown away).
- **Festive/wedding-season merchandising**: Raksha Bandhan/Diwali/Nov–Feb wedding banners + sale collections.
- **Phone/OTP login** (mobile-number-first India; Aza sends OTP over WhatsApp).
- **Self-serve return/exchange initiation** from order history with reverse pickup (exchange-first culture).
- **Recently viewed strip**; **social links + shoppable Instagram feed** (currently zero social links — unusual for a fashion brand).
- **Server-side cart/wishlist persistence** for logged-in users (currently localStorage-only, doesn't follow across devices).
- **Error monitoring** (Sentry) + uptime alerting.
- **next/image or CDN pipeline** once real photos exist (AVIF/WebP, srcset) to protect Core Web Vitals on mid-range Android.
- **Google Merchant Center** free listings once photos exist.

## C. OPTIONAL — differentiators for later
- **Monogramming/engraving** on cufflinks (+₹300–500 pricing power; hard for marketplaces to copy)
- **Wedding/groomsmen program** (5–10 identical ties + cufflinks per order; enormous Indian market)
- Image zoom on PDP (once real photos)
- Loyalty/rewards + referral program (scale-stage)
- Price-drop alerts on wishlisted items
- "As Seen In" press band + authenticity/quality-guarantee storytelling
- Post-purchase account-creation invite on confirmation page (Baymard best practice)
- Rule-based "complete the look" color-matched recommendations
- Catalog pagination/server-side filtering (matters past ~100 SKUs)
- PWA (installability, offline shell) for mobile-first India
- FAQPage schema + AI-agent readiness (agents.md)
- Accessibility conformance pass (WCAG; also an emerging norm)

---

## Suggested build order
1. **Wave 1 (before any real customer):** A1 blockers + A2 legal pages + password reset + Razorpay webhook + analytics + SEO foundation
2. **Wave 2 (launch week):** Shiprocket tracking + WhatsApp support + newsletter backend + welcome coupon + reviews capability + COD guardrails
3. **Wave 3 (first month):** bundles + gifting suite + abandoned-cart + size guides + PIN-code estimates + festive merchandising
4. **Wave 4 (growth):** monogramming, groomsmen program, loyalty, referral, PWA

## One-integration multipliers
- **Shiprocket** → tracking + PIN serviceability + COD rules + reverse pickup (4 gaps, 1 integration)
- **Razorpay Magic Checkout** → express checkout + prefilled addresses + COD controls + abandoned-cart webhook on top of existing Razorpay
- **Klaviyo/Brevo** → newsletter + welcome flow + abandoned cart + review requests
