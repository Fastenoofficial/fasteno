# Fasteno.in Production Cutover Plan

## Purpose and current status

Replace the website at `https://fasteno.in` with the validated Next.js 15.5.25 release while preserving products, customers, orders, payments, stock, Supabase data, authentication, integrations, DNS records, and a schema-compatible rollback path.

**Status: NO-GO.** This runbook is preparation, not permission to change production. Production remains blocked until live ownership, the exact database state, a tested backup, one immutable release commit, a rehearsed maintenance mechanism, and explicit approvals are established.

## Verified current state

- `fasteno.in` returns HTTP 200 from Vercel; `www.fasteno.in` redirects to the apex with HTTP 308.
- DNS uses `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
- Vercel CLI is authenticated as `fastenoofficial-8636`, active team `Fasteno`.
- That team reports zero owned domains and cannot inspect `fasteno.in`; the domain belongs to another Vercel context/account.
- Team projects:
  - `fasteno-shyama`: valid Next.js project; possible fallback destination.
  - `fasteno.in`: framework preset `Other`, middleware-only output, default URL HTTP 500; never use it.
  - `fasteno`: older Next.js project; do not select it without live ownership evidence.
- Local `main` is 13 commits ahead of `origin/main` plus a large validated, uncommitted tree. The tested source has no immutable release SHA yet.
- The configured Supabase database was observed missing migration 007’s `site_banners.product_1_id`; the complete live schema/ACL state is unknown.
- Supabase CLI, hosted Supabase tools, and a usable local PostgreSQL/Docker runtime are unavailable.

## Destination decision

### Preferred — retain the current domain-owning project

After access is restored, identify the project currently serving `fasteno.in`. If it can be configured for this Next.js release, deploy within that project. Vercel can promote the new deployment while retaining domain/DNS ownership, which is safer than detaching the domain.

### Fallback — `Fasteno/fasteno-shyama`

Use this correctly configured project only if the existing project cannot be retained. A fallback requires a Vercel-confirmed cross-context transfer/reassignment. Never remove the source domain before destination claimability, protection, and rollback are rehearsed.

## Mandatory immutable release

Production must come from a clean checkout of a reviewed Git release commit. There is no dirty-workspace or undefined bundle exception.

1. Record the source SHA/deployment currently serving `fasteno.in`.
2. Review the complete delta from that source, including the local branch’s preceding 13 commits and all required tracked/untracked files.
3. With explicit permission, create `release/fasteno-production-2026-09`.
4. Stage an explicit allowlist of source, configuration, migrations, lockfile, and deployment documentation. Exclude `.env.local`, all secrets, `.next`, `node_modules`, logs, credentials, and unrelated files.
5. Review the staged file list and staged diff, create one release commit, and push the new branch without force only if separately authorized.
6. Build and smoke a clean worktree/checkout of that exact SHA.
7. Freeze automatic production deployments during the cutover.
8. Record release SHA, complete diff range, dependency lock hash, validation evidence, and Vercel deployment IDs.

If a release commit is not authorized, production deployment stops.

## Mandatory go/no-go gates

- [ ] Access to the Vercel context owning `fasteno.in` is proven.
- [ ] Live project, deployment ID/URL, source SHA, aliases, domain/TLS, protection, environment names, crons, and Git integration are recorded.
- [ ] Existing-project promotion or fallback transfer is selected and rehearsed.
- [ ] Production Supabase project is positively identified; historical ref `jnvhnfjpeaifclajacsm` is not accepted without dashboard confirmation.
- [ ] Fresh backup/tested PITR restore point is recorded.
- [ ] Both historical `002_*` bodies and an exact migration-006 definition/ACL fingerprint are verified.
- [ ] Razorpay duplicate preflight has zero unresolved groups.
- [ ] Clean release SHA passes install, audit, typecheck, build, diff, and smoke checks.
- [ ] Required environment values are verified in provider dashboards without exposing secrets.
- [ ] Every production-credentialed source/destination alias and immutable deployment URL can be blocked and anonymously verified during maintenance.
- [ ] A route-scoped Razorpay webhook path and operator-only test path through maintenance are rehearsed, or a tested application maintenance gate is included in a new validated release SHA.
- [ ] Exactly one project will have an effective `CRON_SECRET`/authorized schedule after cutover.
- [ ] Schema-compatible rollback deployment IDs are pinned.
- [ ] Maintenance, production promotion/domain action, migrations, synthetic writes, and reopening receive explicit approval.

## Phase 1 — ownership and baseline

1. Inspect every available Vercel account/team and locate `fasteno.in`.
2. Record without exposing secrets: project/team, deployment ID/URL, source SHA, build settings, all aliases/immutable URLs, environment names, TLS/protection, cron jobs, and auto-deploy configuration.
3. Keep the current domain/deployment unchanged.
4. Record all DNS records and preserve TXT/CNAME/MX/SPF/DKIM/DMARC/Resend/verification entries. Ignore old hard-coded DNS instructions in repository history.
5. Capture anonymous status/title/CSP/HSTS/chunk fingerprints for `/`, `/shop`, `/cart`, a product, `/login`, `/track-order`, `/robots.txt`, and `/sitemap.xml`.
6. Mark Razorpay, email, Shiprocket, Google login, and GA4 individually as **enabled and verified** or **intentionally disabled**.

## Phase 2 — Supabase backup and exact read-only fingerprint

### Backup

1. Positively identify production in Supabase Dashboard.
2. Record the latest managed backup/PITR state.
3. Create a fresh backup/restore point and verify the designated operator can restore it. Stop if no credible restore path exists.
4. Record aggregate row counts only; do not export PII into this workspace/report.

Never run `supabase/SETUP_ALL.sql` or `supabase/seed.sql` during deployment.

### Migration/object inventory

Run read-only SQL:

```sql
select
  to_regclass('public.categories') as categories,
  to_regclass('public.products') as products,
  to_regclass('public.orders') as orders,
  to_regclass('public.guest_order_access_tokens') as migration_006_guest_tokens,
  to_regclass('public.security_migration_state') as migration_006_state,
  to_regclass('public.admin_activity') as migration_009_activity;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'site_banners' and column_name in
      ('product_1_id', 'product_2_id', 'starts_at', 'ends_at'))
    or (table_name = 'products' and column_name in
      ('featured_order', 'country_of_origin', 'hsn_code', 'meta_title', 'meta_description'))
    or (table_name = 'categories' and column_name in ('image_url', 'display_on_home'))
    or (table_name = 'orders' and column_name in
      ('guest_legacy_access_until', 'shiprocket_order_id'))
  )
order by table_name, column_name;
```

If `supabase_migrations.schema_migrations` exists, export its version/name list. A missing, manual, or contradictory ledger is not proof that migration 006 is complete.

### Exact migration-006 fingerprint

Export and compare every result against `006_security_hardening.sql`, not just object names:

```sql
-- RLS state, persistence, and ownership.
select n.nspname as schema_name, c.relname, c.relkind,
       c.relpersistence, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'orders', 'order_items', 'newsletter_subscribers',
    'guest_order_access_tokens', 'security_migration_state',
    'order_number_seq'
  )
order by c.relname;

-- Exact column types, nullability, generated/default expressions, and order.
select table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, is_identity, identity_generation,
       is_generated, generation_expression, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('guest_order_access_tokens', 'security_migration_state')
order by table_name, ordinal_position;

-- Exact constraints and indexes for service-only/guest objects.
select conrelid::regclass as relation, conname,
       pg_get_constraintdef(oid, true) as definition
from pg_constraint
where conrelid in (
  'public.guest_order_access_tokens'::regclass,
  'public.security_migration_state'::regclass
)
order by relation::text, conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('guest_order_access_tokens', 'security_migration_state')
order by tablename, indexname;

-- Exact policy roles/commands/expressions.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'orders', 'order_items', 'newsletter_subscribers',
    'guest_order_access_tokens', 'security_migration_state'
  )
order by tablename, policyname;

-- Include PUBLIC and every application-role table privilege.
select grantee, table_name, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'orders', 'order_items', 'newsletter_subscribers',
    'guest_order_access_tokens', 'security_migration_state'
  )
  and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
order by table_name, grantee, privilege_type;

-- Expand the sequence ACL so USAGE, SELECT, and UPDATE are all visible;
-- grantee oid 0 is PostgreSQL's implicit PUBLIC role.
select case
         when expanded.grantee = 0 then 'PUBLIC'
         else pg_get_userbyid(expanded.grantee)
       end as grantee,
       expanded.privilege_type,
       expanded.is_grantable,
       pg_get_userbyid(expanded.grantor) as grantor
from pg_class sequence_relation
cross join lateral aclexplode(
  coalesce(
    sequence_relation.relacl,
    acldefault('S', sequence_relation.relowner)
  )
) as expanded
where sequence_relation.oid = 'public.order_number_seq'::regclass
  and (
    expanded.grantee = 0
    or pg_get_userbyid(expanded.grantee) in
      ('anon', 'authenticated', 'service_role')
  )
order by grantee, expanded.privilege_type;

-- Function body, signature, SECURITY DEFINER, search_path, and effective ACL.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       p.prosecdef as security_definer,
       p.proconfig,
       has_function_privilege('PUBLIC', p.oid, 'EXECUTE') as public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'decrement_stock', 'restore_stock', 'increment_coupon_usage',
    'confirm_razorpay_order_payment', 'fail_razorpay_order_payment',
    'search_product_autocomplete'
  )
order by p.proname, identity_arguments;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'product-images';

select migration_key, applied_at
from public.security_migration_state
where migration_key = '006_guest_legacy_grace';
```

Choose “migration 006 complete” only when a trusted ledger **and** definitions/ACLs exactly match all migration-006 invariants: RLS enabled, guest constraints/indexes present, public order/newsletter inserts removed, service/sequence grants correct, guest/security tables closed, mutating RPCs service-only, function bodies/search paths current, bucket constrained, autocomplete intentionally callable, and marker present. Any missing ledger, definition, constraint, RLS flag, PUBLIC/role/sequence privilege, function configuration, policy expression, or mismatch is **partial 006** and requires reviewed forward convergence by rerunning/fixing migration 006 under maintenance.

After maintenance entry, direct anon and ordinary authenticated negative probes must confirm effective denial.

### Razorpay duplicate preflight

Counts only; never put identifiers into the report:

```sql
with order_id_groups as (
  select razorpay_order_id, count(*) as occurrences
  from public.orders
  where razorpay_order_id is not null
  group by razorpay_order_id
  having count(*) > 1
), payment_id_groups as (
  select razorpay_payment_id, count(*) as occurrences
  from public.orders
  where razorpay_payment_id is not null
  group by razorpay_payment_id
  having count(*) > 1
)
select 'razorpay_order_id' as identifier_type, count(*) as duplicate_groups,
       coalesce(sum(occurrences - 1), 0) as extra_rows
from order_id_groups
union all
select 'razorpay_payment_id', count(*), coalesce(sum(occurrences - 1), 0)
from payment_id_groups;
```

Any non-zero result is a stop requiring manual Razorpay/order reconciliation. Never auto-delete or null a commerce identifier.

## Phase 3 — clean release and provider configuration

From the clean release SHA:

```powershell
npm ci
npm audit
npm audit --omit=dev
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

Run `next start` smoke for `/`, `/shop`, `/cart`, and a representative product. Stop on schema/environment/runtime warnings.

Verify production values in the selected Vercel dashboard, never in chat/source/logs:

Mandatory: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://fasteno.in`, both Upstash values, independent `RATE_LIMIT_HASH_SECRET`, and complete `ALLOWED_IMAGE_HOSTS`.

When Razorpay is enabled: matching `NEXT_PUBLIC_RAZORPAY_KEY_ID`/`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, independent `RAZORPAY_WEBHOOK_SECRET`, and webhook `https://fasteno.in/api/razorpay/webhook` for `payment.captured`/`payment.failed`.

Optional only when deliberately enabled and verified: Resend sender/alerts, Shiprocket credentials/pickup/parcel/auto-ship, GA4 explicit-events mode, and Google OAuth.

Supabase Auth must use Site URL `https://fasteno.in`, allow `https://fasteno.in/auth/callback`, require intended email confirmation, password length ≥12, leaked-password protection, and reviewed Auth rate limits.

### Exactly-one-cron rule

- Same-project promotion: one project remains authoritative; verify its schedules after promotion.
- Fallback second project: keep destination `CRON_SECRET` **absent** and/or schedules disabled. Never set a dummy/different secret—Vercel would send that project’s own value and authorize it.
- Before reopening, disable source schedules/authorization, set destination `CRON_SECRET`, redeploy if required, pin/reverify the resulting SHA/deployment, and prove exactly one authorized run for each route.
- Required schedules: `/api/cron/reap-orders` at `0 20 * * *`; `/api/cron/sync-shipments` at `23 7 * * *`.

## Phase 4 — preview and isolated candidate

Only after Approval 1:

1. Link a clean release checkout to the selected project.
2. Verify Preview/Production environment names and integration decisions.
3. Deploy a protected preview and perform read-only storefront, headers, images, and auth-gate checks.
4. Do not submit checkout/newsletter/upload/admin/payment/cron calls against production data.
5. Record preview deployment ID/URL.
6. Existing-project path: keep the validated preview as candidate; do not promote to production until maintenance is active because promotion changes live traffic.
7. Fallback-project path: a production candidate may be created without the custom domain only if `CRON_SECRET` is absent/schedules disabled and **every** project alias plus immutable deployment URL is protected and anonymously verified.
8. Confirm intended production-domain protection with an anonymous client. A Vercel login page is not an application success response.
9. Record candidate SHA, deployment ID, logs, build fingerprint, and schema-compatible rollback ID.

## Phase 5 — maintenance rehearsal and entry

### Required host coverage

Inventory all hostnames with production credentials using Vercel project/domain/alias/deployment metadata. Protection must cover:

- `fasteno.in` and `www.fasteno.in`;
- source project production aliases;
- source immutable deployment URLs that remain active;
- fallback destination project aliases and immutable candidate URLs;
- any branch/preview URL configured with production Supabase/service-role credentials.

Enable project-wide Deployment Protection or equivalent firewall/application maintenance rules. From a clean anonymous client, verify each hostname blocks GET and harmless malformed POST requests to `/api/checkout`, `/api/newsletter`, `/api/razorpay/verify`, `/api/razorpay/webhook`, `/api/admin/upload`, and both cron routes **before application code/database access**. If any production-credentialed URL remains reachable, stop. Do not delete the only rollback deployment as a substitute.

### Required webhook/operator path

Before go-live approval, rehearse one of these designs:

1. **Route-scoped provider/firewall exception:** keep deny-all maintenance, narrowly allow only signed POST requests to the new `/api/razorpay/webhook`, and create a separate time-limited operator allowlist/bypass for controlled checkout/verify/admin tests; or
2. **Application maintenance gate:** add a reviewed environment-controlled gate that blocks customer/admin writers across every hostname, permits only HMAC-valid Razorpay webhooks plus explicit operator test access, then create a new release SHA and repeat all validation.

Do not place a Vercel bypass secret in a public URL or report. If neither design can be securely implemented and anonymously verified, stop. A real Razorpay callback cannot be assumed to carry a browser’s Vercel bypass cookie.

### Enter maintenance

1. Activate verified protection/gate on all source and candidate hostnames.
2. Stop admin/catalog/order activity and drain in-flight requests.
3. Disable source cron schedules/authorization; keep destination cron unauthorized.
4. Pause new Razorpay checkout initiation while retaining the rehearsed signed-webhook path. Record the pause timestamp and reconcile provider events before reopening; do not assume automatic replay.
5. Pause Shiprocket/auto-ship and other order/newsletter/guest writers.
6. Re-run anonymous negative probes on every hostname.

Maintenance stays active through traffic movement, all migrations, read-only checks, and scoped synthetic writes.

## Phase 6 — traffic switch and migration state machine

### Switch while protected

- Existing-project path: promote the exact candidate within the same project.
- Fallback path: perform only the rehearsed Vercel-confirmed atomic domain transfer/reassignment to `Fasteno/fasteno-shyama`; configure destination protection before detaching source. Remove-then-add is allowed only with confirmed immediate claimability and tested rollback.

Verify the custom domain serves the new SHA/fingerprint through an authorized operator path while anonymous traffic remains blocked.

### Branch A — migration 006 exactly complete

1. Migration 007 may be applied earlier because it is additive; verify it.
2. With new app selected and maintenance active, apply migration 008.
3. Apply migration 009.
4. Re-run duplicate counts.
5. Apply migration 010.

Migrations 008/009 are not declared compatible with the unknown old admin app; admin/catalog writes remain frozen until the matching app and schema pass verification.

### Branch B — migration 006 missing or partial

1. Keep all traffic/writers blocked on the new candidate.
2. Review every mismatch and confirm rerunning/fixing migration 006 is a safe forward convergence.
3. Apply/re-run migration 006.
4. Verify exact definitions/ACLs plus direct negative probes.
5. Apply migrations 007, 008, 009, and 010 in order without reopening between them.

The new app may consume 006 objects before step 3; maintenance prevents requests from reaching that transient state.

### Migration-010 acceptance

If migration 010 aborts with SQLSTATE `23505`, remain in maintenance and manually reconcile the conflict before retrying. Verify unique Razorpay indexes, removed redundant featured index, admin-only structural RPCs, safe ordinary metadata grants, direct critical product update/delete denials, safe draft/state product creation, atomic archive/duplicate/bulk activity, and unchanged service/manual order/Shiprocket writes.

## Phase 7 — verification under maintenance

Through authorized operator/scoped paths:

- verify exact custom-domain SHA/fingerprint, routes, categories/products/cart/checkout shell, CSP/HSTS/TLS/images, sitemap/robots, `www` redirect, and clean Vercel logs;
- verify signup confirmation, login/logout, password recovery callback, session cookies, non-admin/admin gates, and Google OAuth if enabled;
- run disposable category/banner upload/order and product draft→activate→feature→archive, duplicate/bulk/activity/media-report checks;
- test newsletter, COD stock reserve/cancel/restore, guest credential/order/invoice access;
- use the rehearsed scoped route/operator path for an approved low-value Razorpay transaction, captured webhook, browser verify, replay, and failed-payment behavior;
- verify manual order tracking/status and Shiprocket only if enabled;
- confirm anon/ordinary authenticated ACL/RPC denials.

Never put PII, guest tokens, keys, payment IDs, or webhook bodies in reports.

## Phase 8 — controlled reopening

1. Reconcile Razorpay events from the maintenance interval.
2. Keep customer checkout blocked while confirming the signed webhook route, then enable Razorpay/checkout for one monitored transaction.
3. Enable COD/guest/newsletter and monitor.
4. Enable admin/catalog writes.
5. Enable Shiprocket/manual automation if intended.
6. Ensure source cron is disabled; set destination `CRON_SECRET`, redeploy if required, verify the new deployment, run each cron once, and prove one invocation.
7. Remove anonymous maintenance protection last.
8. Repeat public smoke and monitor Vercel/Supabase/Razorpay through the rollback window.

## Schema-aware rollback matrix

| Schema state | Permitted application rollback |
|---|---|
| Before new migrations | Recorded old deployment only if exact source/environment baseline is verified. |
| After migration 006 | Only a deployment proven to use service-role order/newsletter writes and 006 guest/payment RPCs. Unknown old app forbidden. |
| After migration 008 | Only a deployment using migration-008 ordering RPCs, otherwise catalog/admin stays frozen. |
| After migration 009 | Only a deployment compatible with migration-009 product/activity RPCs. |
| After migration 010 | Only this safe-draft/catalog/payment release or a reviewed forward fix. |

Pin a compatible Vercel deployment for every reached state. After applying any missing 006 or migration 008, the validated new release—not the unknown old deployment—is the practical application rollback target.

Database restore can desynchronize captured payments, inventory, guest credentials, webhooks, and shipments. Keep writers paused, restore only with the designated operator, reconcile Razorpay/orders/stock, rotate restored secrets if needed, and reopen through Phase 8. Never weaken grants or edit applied migrations backward.

## Required approvals

### Approval 1 — release and preview

The user must confirm domain-owner and Supabase access, current owning project, permission to create the release branch/commit (and separately whether to push), permission to link/upload a protected preview or isolated fallback candidate, and permission to inspect provider metadata/environment **names** and run read-only SQL. No secret values are pasted into chat.

### Approval 2 — go live

After backup, exact migration fingerprint, duplicate counts, preview/candidate, all-host maintenance rehearsal, scoped webhook/operator path, cron plan, and rollback IDs are shown, the user separately authorizes the maintenance window, promotion/domain action, exact missing migrations, controlled synthetic writes, and staged reopening.

Neither approval authorizes the seed, commerce-record repair/deletion, force-push, weaker grants, unrelated DNS changes, or exposing credentials.