# Supabase schema setup

## Canonical source

The files in `supabase/migrations/` are the canonical schema and security history. Apply every migration in filename order, then apply `supabase/seed.sql` only when sample catalog data is wanted.

`SETUP_ALL.sql` is a legacy bootstrap snapshot. It does **not** contain all later schema additions or the final security posture and must not be used by itself for a new or production project. In particular, migration `006_security_hardening.sql` removes public order/newsletter writes and adds hashed guest-order credentials.

Do not rename or edit migration files that may already have been applied. This repository has two historical `002_*` files; projects previously managed through the SQL editor should verify their remote migration ledger before adopting an automated migration workflow. Apply `002_content_management.sql` before `002_growth.sql` when running the files manually.

The optional seed now expects the complete migration chain (currently through `010_catalog_payment_integrity.sql`). It preserves existing administrator category/featured ordering while appending missing sample entries; do not run the legacy `SETUP_ALL.sql` afterward.

## Deployment order for migrations 007–010

Apply `007_hero_carousel.sql` after 006, then `008_catalog_ordering.sql`, `009_admin_operations_safety.sql`, and `010_catalog_payment_integrity.sql`. Deploy each migration with its matching application code; the current admin product actions require the RPCs from both 008 and 009, and migration 010 must follow its compatible safe-draft product-creation release.

Migration 008 normalizes legacy positions, makes category visibility non-null, adds collision-preventing unique indexes, and installs admin-only category/featured ordering RPCs. Migration 009 adds immutable admin activity, replaces product state/category changes with complete-set locked transactions, routes existing feature membership calls through that safe path, and allocates duplicate slugs under a database lock. Duplicate rows intentionally start inactive, unfeatured, at zero stock, with empty image and SEO fields.

Migration 010 converts the migration-008 structural mutators to explicitly admin-checked security-definer RPCs before narrowing authenticated table grants. New products are inserted only as inactive drafts, direct hard deletion and direct publication/category/order transitions are denied, and ordinary product/category metadata editing remains available. It also aborts with a named preflight error if duplicate non-null Razorpay identifiers exist, otherwise adds one-to-one partial indexes and explicit payment-id mismatch/conflict outcomes while preserving browser verification without a captured amount. Apply it in a maintenance window after reconciling any preflight finding; it never auto-deletes or rewrites commerce records.

The media inventory is report-only and requires the server-only `SUPABASE_SERVICE_ROLE_KEY` to recursively list `product-images` and include hidden/historical references. It never deletes Storage objects. Before using an “unreferenced” result operationally, review archived products, categories, every banner state, historical order-item snapshots, and the full CSV export.

## Deployment order for migration 006

Follow the full operator checklist in [`../SECURITY_DEPLOYMENT.md`](../SECURITY_DEPLOYMENT.md).

1. Configure the server-only `SUPABASE_SERVICE_ROLE_KEY`, then deploy the matching application release so live writes no longer depend on anon insert grants.
2. Apply `006_security_hardening.sql` immediately afterward in Supabase.
3. Confirm checkout, newsletter signup, guest order access, admin upload, Razorpay webhook processing, and direct-anon negative checks.

Treat this as a coordinated release, not a zero-downtime claim: new guest-token and atomic payment paths consume objects created by 006, so keep the app-first gap tightly controlled or use a maintenance window. The migration is additive/idempotent and does not contact or mutate a project until an operator explicitly applies it. Existing guest UUID-only links receive one 30-day grace window anchored to the first application of migration 006; new guest orders never receive legacy access.
