# Security deployment checklist

This is an operator checklist, not a secret store. Keep all values in the deployment platform/Supabase dashboards and never paste credentials into this file, source control, logs, screenshots, or support tickets.

## 1. Preflight and migration 006

1. Back up the production database and record the current application deployment and migration ledger.
2. Treat `supabase/migrations/` as the canonical schema history. Apply files in filename order and never rename or edit a migration that may already have run. `supabase/SETUP_ALL.sql` is only a legacy snapshot.
3. Resolve the historical duplicate `002_*` caveat before automation: verify both bodies in the remote project; for manual application, `002_content_management.sql` precedes `002_growth.sql`. Migrations 003–006 depend on that history.
4. Configure the server-only `SUPABASE_SERVICE_ROLE_KEY`, then deploy the application release that routes live order, stock, payment, guest-access, newsletter, and upload writes through the service client **before** migration 006 removes public inserts. The key is mandatory in live mode; only demo mode may omit it.
5. Apply `006_security_hardening.sql` immediately after the application deploy and run the checks below. This is a coordinated release: the application removes reliance on anon writes, while its guest-token and atomic payment paths consume objects added by 006. Use a maintenance window or otherwise keep the app-first gap tightly controlled; do not describe either order as zero-downtime without an expand/contract migration split.

Migration 006 gives pre-existing guest orders a UUID-only compatibility deadline 30 days after its first application. New guest orders instead receive a random bearer credential whose default lifetime is also 30 days. Re-running 006 does not restart the legacy window. Treat access URLs/cookies as secrets and do not log or share them.

## 2. Required production configuration

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. The service key bypasses RLS; expose it only to server runtimes and rotate it if disclosure is suspected.
- **Strict rate limits:** set both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. In production, guest-link exchange, Razorpay verification, newsletter signup, order tracking, and admin upload fail closed with 503 when their strict distributed limiter is missing or unavailable.
- **Limiter privacy:** set an independent high-entropy `RATE_LIMIT_HASH_SECRET` (at least 32 random bytes). Do not reuse a public key or a human password.
- **Razorpay:** set matching public/server key IDs, the server-only API secret, and an independent `RAZORPAY_WEBHOOK_SECRET`. Configure the production webhook URL for `payment.captured` and `payment.failed`, and confirm the account capture mode matches the application flow.
- **Cron:** set a high-entropy `CRON_SECRET` in the same deployment environment. Both configured cron routes authenticate with `Authorization: Bearer ...`; monitor non-2xx responses rather than assuming a 200 means work completed.
- **Site URL:** set the canonical HTTPS `NEXT_PUBLIC_SITE_URL` before issuing guest links or transactional email.

## 3. Supabase Auth dashboard

Before production traffic, configure and verify these dashboard controls:

- require email confirmation;
- set the minimum password length to at least 12 characters;
- enable leaked-password protection;
- review Auth rate limits for the expected traffic and email provider capacity;
- configure a supported CAPTCHA provider and its dashboard credentials **before** enabling any CAPTCHA widget in the application; no nonfunctional CAPTCHA environment variables are defined here;
- plan admin MFA as a follow-up that implements enrollment and challenge enforcement on admin entry/actions. Enabling an MFA option in the dashboard alone does not make the current admin routes require a challenge.

## 4. Image allow-list and CSP

`img-src` no longer permits the global `https:` scheme. It is generated from the exact HTTPS hostname in `NEXT_PUBLIC_SUPABASE_URL` plus comma-separated exact DNS hostnames in `ALLOWED_IMAGE_HOSTS`. When `NEXT_PUBLIC_GA_ID` is configured, the policy also includes the exact Google Tag Manager/Analytics origins already required by that integration so its image-beacon fallback remains compatible. Entries must not contain schemes, paths, ports, leading dots, or wildcards. Environment changes require a rebuild/redeploy.

Before deploying, inventory every persisted image origin, including `products.images`, category images, banner desktop/mobile images, and historical `order_items.image` snapshots. Add each legitimate non-Supabase host explicitly. The Supabase project host is automatic, but application write validation only accepts its public `product-images` bucket path. An omitted legacy host will be blocked by CSP even if the row still exists.

Verify the deployed `Content-Security-Policy` header with an HTTP header request and browser DevTools. Smoke-test Next hydration/navigation, GA collection (when configured), all four admin image-upload forms, and a Razorpay checkout. Confirm no unexpected CSP reports occur. `script-src-attr 'none'` blocks HTML event-handler attributes, but `script-src 'unsafe-inline'` still remains for current Next hydration and authored inline GA/admin script elements; this is not a completed nonce rollout. `style-src 'unsafe-inline'` likewise remains for current inline style usage.

## 5. Post-migration negative and positive checks

In a non-production rehearsal first, then against production with disposable records where safe:

- using the anon key directly (not an application server endpoint), verify inserts into `orders`, `order_items`, and `newsletter_subscribers` are denied; repeat as an ordinary authenticated non-admin user;
- verify anon/authenticated callers cannot execute `decrement_stock`, `restore_stock`, `increment_coupon_usage`, `confirm_razorpay_order_payment`, or `fail_razorpay_order_payment`; public autocomplete remains intentionally callable;
- confirm live COD and Razorpay checkout, stock reservation/restore, newsletter signup, guest link exchange/order/invoice access, owner order access, order tracking, admin upload, webhook capture/failure handling, and both cron routes;
- test one guest order created before 006 inside the 30-day legacy window and verify UUID-only access fails after the recorded deadline; verify new guest orders always require their bearer credential;
- inspect server logs for service-client, rate-limiter, webhook, and reaper failures without recording bearer tokens or credentials.

## 6. Rollback cautions

- Do not roll the application back to a version that writes orders/newsletters through anon after 006. It will fail, and restoring public grants/policies as a shortcut reopens the vulnerability.
- Never rewrite an applied migration. Correct production state with a reviewed forward migration. If 006 must be delayed, keep the service-only application behavior and required service key.
- Database restore/rollback can desynchronize orders, reserved stock, guest credentials, webhooks, and captured payments. Pause checkout/webhooks as appropriate and reconcile Razorpay transactions manually before reopening traffic.
- A missing image host should normally be corrected by auditing `ALLOWED_IMAGE_HOSTS` and redeploying, not by restoring the scheme-wide `https:` source.
- Rotate affected secrets after any rollback that restores old environment snapshots, and verify the 30-day migration marker rather than attempting to reset guest legacy access.

## 7. Privacy-scoped analytics

Browser analytics remains disabled unless both a valid `NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_GA_EXPLICIT_EVENTS_ONLY=true` are deployed. Before setting that acknowledgement, disable **Enhanced Measurement and every automatically collected web-stream interaction** in the GA4 data-stream settings. The application intentionally emits manual, allowlisted events only; it redacts dynamic storefront paths and suppresses admin, auth, account, order, invoice, access, payment, and order-tracking routes.

Validate with GA DebugView and the browser Network panel using synthetic, non-personal inputs. Confirm `/search?q=...` sends only `/search` plus a query-length bucket, guest checkout exchanges its credential by POST before navigating to a clean order URL, and no request includes a referrer, raw document title, search text, contact/address/PIN fields, coupon, order number, guest token, error text, or Razorpay identifier. Leave the acknowledgement unset if those dashboard controls cannot be verified.
## 8. Admin operations and media inventory (migration 009)

Deploy `009_admin_operations_safety.sql` with the matching admin application release, after migrations 007 and 008. It replaces the existing `set_products_featured` body, adds security-definer product-operation RPCs with explicit `auth.uid()`/admin checks, and adds append-only `admin_activity`; an old application against 009 remains compatible with the preserved feature RPC signature, but the new duplicate/archive/bulk actions will fail closed until 009 exists.

Rehearse these checks before production:

- as anon and an ordinary authenticated user, verify `admin_manage_products`, `admin_duplicate_product`, and `set_products_featured` are denied, and `admin_activity` cannot be read or written;
- as an admin, duplicate a disposable product and confirm the copy is inactive, unfeatured, zero-stock, and has empty image/meta fields with a collision-safe slug;
- archive a featured disposable product and confirm deactivation, unfeaturing, featured-order compaction, and its activity row commit together; submit duplicate/missing bulk IDs and confirm the whole request fails without partial changes;
- confirm activity actors equal the authenticated administrator and that direct activity INSERT, UPDATE, DELETE, and forged actor/timestamp attempts fail;
- configure `SUPABASE_SERVICE_ROLE_KEY`, open `/admin/media`, and export `/api/admin/export/media`; reconcile products (including archived), categories, all banners, and historical `order_items.image` references against a small known fixture;
- verify the media UI/API remain report-only. Migration 009 creates no Storage deletion function, and the application must not add a cleanup button or deletion endpoint without a separately reviewed retention process and backup.

Do not apply this migration or run report findings as cleanup against live Supabase without an explicit deployment decision, a current backup, and review of the generated CSV.

## 9. Catalog/payment integrity (migration 010)

Deploy the matching application release **before** applying `010_catalog_payment_integrity.sql`. The compatible release creates new products as inactive drafts, omits direct featured-order columns, and applies publication/category/featured state through migration 009's locked RPC. After migration 010, an older application can no longer directly insert publication/order fields or hard-delete failed creations, so do not roll the application back independently.

Use a non-production rehearsal and a production maintenance window:

1. Back up the database and pause checkout, payment callbacks, catalog administration, and any other order/catalog writers.
2. Query duplicate non-null `orders.razorpay_order_id` and `orders.razorpay_payment_id` values and reconcile every conflict against Razorpay and local order history. The migration repeats this check under a table lock and aborts with SQLSTATE `23505`; it deliberately never chooses, nulls, or deletes a commerce record.
3. Apply migration 010. Confirm both partial unique indexes exist, the obsolete non-unique featured-order index is gone, and the category/featured ordering RPCs remain authenticated-admin-only.
4. As an admin, create inactive, active, and featured disposable products; edit ordinary product/category metadata; move category/featured positions; archive a product; and confirm direct authenticated updates to product `active`, `category_id`, `featured`, or `featured_order` and direct product DELETE are denied.
5. Verify a successful Razorpay browser callback (no captured amount), a captured webhook (authoritative amount), same-payment idempotency, and synthetic mismatch/conflict outcomes. `payment_id_mismatch` and `payment_id_conflict` are permanent HTTP 409 reconciliation states, not retry loops. Confirm failed-payment recapture still rolls stock back if a payment-id uniqueness race is lost.
6. Resume traffic only after checking checkout stock compensation, order confirmation, webhook responses, manual admin order updates, Shiprocket synchronization, and server logs.

Migration 010 supersedes migration 005's historical privilege wording: Shiprocket synchronization writes through the service client in the application, while authenticated order table updates remain restricted to administrators by RLS for manual status/tracking workflows. It does not revoke those required admin order updates.

Do not apply migration 010 to live Supabase from a development session. Its Razorpay preflight and all ACL behavior must be verified against a backup/rehearsal first.

## 10. Application maintenance gate

Use the built-in gate for coordinated application/schema releases; do not simulate maintenance by deleting credentials or weakening database grants.

- `MAINTENANCE_MODE=1` blocks ordinary pages, static assets, APIs, Server Actions, auth callbacks, admin actions, and cron routes in middleware before application or database code. Unset it or set `0` for normal operation.
- Generate a fresh `MAINTENANCE_BYPASS_SECRET` for every window: exactly 32 random bytes encoded as 64 hexadecimal characters. A missing/malformed secret keeps maintenance active with no operator unlock. Never reuse or expose it in URLs, logs, reports, screenshots, or browser JavaScript.
- Operators unlock with the same-origin POST form on the maintenance page. The raw secret is not stored: the response sets a Secure, HttpOnly, SameSite=Strict, host-only `__Host-fasteno-maintenance` cookie containing a signed issuance time. Both browser and server reject it after 15 minutes; each hostname must be unlocked separately.
- `MAINTENANCE_ALLOW_RAZORPAY_WEBHOOK` is ignored during normal operation. While maintenance is active it must remain unset/`0` until migration 006 and all schema-locking payment work are complete. In that state webhook requests receive 503 and must be reconciled against Razorpay after the window; do not assume every provider delivery will replay automatically.
- After migrations 006–010 pass, set `MAINTENANCE_ALLOW_RAZORPAY_WEBHOOK=1` and redeploy while customer traffic remains blocked. Only exact no-query POST requests with a configured webhook secret and a 64-hex signature shape reach the webhook route; the route still performs the authoritative bounded raw-body HMAC before any demo or persistence behavior. Test one signed callback/replay before reopening checkout.
- If callbacks must continue during a longer post-006 phase, explicitly disable `SHIPROCKET_AUTO_SHIP`, keep cron/admin/customer writes blocked, avoid migration-010 lock windows, monitor non-2xx responses, and reconcile the recorded interval.
- Environment changes require a new Vercel deployment. Pin and verify every gated/ungated deployment ID and release SHA. Do not remove maintenance from the public domain until the disabled-mode deployment is verified.

Before applying migrations, inventory every production-credentialed custom domain, project alias, immutable deployment URL, and preview URL. From an anonymous client, confirm all return the 503 maintenance response for pages, assets, checkout, newsletter, browser verification, upload, auth, admin, and cron paths. Confirm restrictive CSP, `noindex`, and private/CDN `no-store` headers. A gate in the new release cannot protect an older deployment URL, so use provider protection or remove production credentials from that old path.

For operator validation, confirm wrong/missing/cross-origin secrets are denied; copied, expired, future-dated, and cross-host cookies fail; a valid cookie still encounters ordinary Supabase authentication and admin authorization; and bypassed responses remain no-store. Rotate/remove the bypass secret after the window. Do not use `Clear-Site-Data`, which would unnecessarily destroy customer sessions.