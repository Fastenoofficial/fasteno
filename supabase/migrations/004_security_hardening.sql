-- ═══════════════════════════════════════════════════════════════════
-- Migration 004: pre-launch security hardening
--
-- Closes holes found in the pre-launch RLS / privilege audit:
--   1. Privilege escalation — a signed-in user could PATCH their own
--      profiles.role = 'admin' via the public anon key (RLS gates the row,
--      not the column).
--   2. SECURITY DEFINER stock/coupon RPCs kept the default PUBLIC EXECUTE
--      grant, so anon could zero inventory, inflate stock, or burn coupon
--      usage_limit directly via PostgREST.
--   3. Order forgery — the orders INSERT policy constrained only user_id,
--      so anon could insert a fabricated payment_status='paid' order.
--   4. Review moderation bypass — the reviews INSERT policy constrained
--      only user_id, so a user could self-insert an 'approved' + 'verified'
--      review, skipping the moderation queue.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor or via the
-- Management API.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. profiles.role escalation ──────────────────────────────────────
-- Table-level UPDATE is granted to anon/authenticated by Supabase default
-- privileges; RLS cannot restrict columns. A column-level REVOKE cannot
-- subtract from a table-level grant, so we drop the table-level UPDATE and
-- re-grant UPDATE only on the columns a customer may legitimately edit
-- (full_name, phone) — never `role`. The service_role and the postgres/SQL
-- path (used to bootstrap admins, see 001_schema.sql) keep full access.
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, phone) on public.profiles to authenticated;

-- ── 2. Lock down mutating SECURITY DEFINER RPCs ──────────────────────
-- These are only ever invoked by the server via the service-role client
-- (lib/orders.ts). Remove the implicit PUBLIC grant and re-grant to
-- service_role explicitly so the server path is unaffected.
revoke execute on function public.decrement_stock(jsonb)        from public, anon, authenticated;
revoke execute on function public.restore_stock(jsonb)          from public, anon, authenticated;
revoke execute on function public.increment_coupon_usage(text)  from public, anon, authenticated;
grant  execute on function public.decrement_stock(jsonb)        to service_role;
grant  execute on function public.restore_stock(jsonb)          to service_role;
grant  execute on function public.increment_coupon_usage(text)  to service_role;

-- validate_coupon(text,int) and product_rating(uuid) are intentionally left
-- anon-callable: both are read-only/STABLE and the app calls them through
-- the server anon client. Coupon codes are promotional, not secrets; the
-- residual enumeration risk is accepted (rate-limited at /api/coupon).

-- ── 3. Order forgery ─────────────────────────────────────────────────
-- Non-admin inserts (guest anon path with user_id null, or a signed-in
-- user inserting their own order) may only create an order that is NOT yet
-- paid and carries no payment id — the authoritative flip to paid/confirmed
-- happens exclusively server-side via markOrderPaid (service role, which
-- bypasses RLS). Admins are unconstrained. COD orders legitimately insert
-- with status='confirmed' + payment_status='pending'; Razorpay with
-- status='pending' + payment_status='pending' — both satisfy the check.
drop policy if exists "orders_owner_insert" on public.orders;
create policy "orders_owner_insert" on public.orders
  for insert with check (
    (auth.uid() = user_id or user_id is null)
    and (
      public.is_admin()
      or (
        payment_status = 'pending'
        and status in ('pending', 'confirmed')
        and razorpay_payment_id is null
      )
    )
  );

-- ── 4. Review moderation / fake-verified bypass ──────────────────────
-- Clients may only insert a review that is 'pending' and not 'verified'.
-- The verified-purchase badge is set authoritatively server-side through
-- the service-role client (components/reviews/actions.ts), which bypasses
-- RLS; only admins/service role can approve (reviews_admin_update).
drop policy if exists "reviews_owner_insert" on public.reviews;
create policy "reviews_owner_insert" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and status = 'pending'
    and verified = false
  );
