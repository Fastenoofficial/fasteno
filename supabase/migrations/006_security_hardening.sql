-- Fasteno Shyama — service-only commerce and guest-access hardening
-- Additive roll-forward migration. Safe to re-run; never edit applied history.
-- Configure the service role and deploy the matching application immediately
-- before this migration so live order/newsletter writes no longer depend on
-- the public grants revoked below. Keep the coordinated rollout gap short:
-- guest-token and atomic payment paths consume objects created in this file.

-- ── Service-owned writes ─────────────────────────────────────────────
-- Preserve existing owner/admin SELECT and admin UPDATE policies. Only the
-- unsafe client-side INSERT paths are removed.
drop policy if exists "orders_owner_insert" on public.orders;
drop policy if exists "order_items_insert" on public.order_items;
drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;

revoke insert on table public.orders from public, anon, authenticated;
revoke insert on table public.order_items from public, anon, authenticated;
revoke insert on table public.newsletter_subscribers from public, anon, authenticated;

-- service_role is the sole application writer for checkout/newsletter. Make
-- privileges explicit rather than depending on Supabase default grants.
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select, insert, update, delete on table public.newsletter_subscribers to service_role;
grant usage, select, update on sequence public.order_number_seq to service_role;

-- ── Hashed, expiring guest-order credentials ─────────────────────────
-- Plaintext credentials exist only in the customer's short-lived request /
-- HttpOnly cookie. The database stores a SHA-256 digest, never the token.
create table if not exists public.guest_order_access_tokens (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  token_hash  text not null unique
              check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  check (expires_at > created_at),
  check (revoked_at is null or revoked_at >= created_at)
);

create index if not exists guest_order_access_order_idx
  on public.guest_order_access_tokens (order_id, expires_at desc);
create index if not exists guest_order_access_expiry_idx
  on public.guest_order_access_tokens (expires_at)
  where revoked_at is null;

alter table public.guest_order_access_tokens enable row level security;
revoke all on table public.guest_order_access_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.guest_order_access_tokens to service_role;

comment on table public.guest_order_access_tokens is
  'Service-only SHA-256 guest order credentials. Plaintext tokens are never persisted.';
comment on column public.guest_order_access_tokens.revoked_at is
  'Non-null immediately invalidates this credential even before expires_at.';

-- Existing guest UUID links receive one bounded compatibility window. A
-- marker prevents an idempotent re-run from granting grace to newer orders.
alter table public.orders
  add column if not exists guest_legacy_access_until timestamptz;

create table if not exists public.security_migration_state (
  migration_key text primary key,
  applied_at    timestamptz not null default now()
);
alter table public.security_migration_state enable row level security;
revoke all on table public.security_migration_state from public, anon, authenticated;
grant select, insert, update on table public.security_migration_state to service_role;

comment on column public.orders.guest_legacy_access_until is
  'Temporary UUID-link compatibility deadline for guest rows predating migration 006; null for new orders.';

do $$
declare
  first_applied_at timestamptz;
begin
  insert into public.security_migration_state (migration_key)
  values ('006_guest_legacy_grace')
  on conflict (migration_key) do nothing
  returning applied_at into first_applied_at;

  if first_applied_at is not null then
    update public.orders
       set guest_legacy_access_until = first_applied_at + interval '30 days'
     where user_id is null
       and created_at <= first_applied_at
       and guest_legacy_access_until is null;
  end if;
end
$$;

-- ── Atomic Razorpay state transitions ────────────────────────────────
-- A late capture after payment.failed must re-reserve inventory BEFORE the
-- order becomes confirmed. Row/product locks make failed-vs-captured races
-- converge without double reservation or restoration.
create or replace function public.confirm_razorpay_order_payment(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_captured_amount integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders%rowtype;
  unavailable record;
  was_failed boolean;
begin
  select * into target
    from public.orders
   where razorpay_order_id = p_razorpay_order_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if target.payment_status = 'paid' then
    return jsonb_build_object(
      'ok', true, 'already_paid', true, 'order_id', target.id
    );
  end if;
  if target.status = 'cancelled' then
    return jsonb_build_object(
      'ok', false, 'reason', 'order_cancelled', 'order_id', target.id
    );
  end if;
  if target.payment_status not in ('pending', 'failed') then
    return jsonb_build_object(
      'ok', false, 'reason', 'invalid_state', 'order_id', target.id
    );
  end if;
  if p_captured_amount is not null and p_captured_amount <> target.total then
    return jsonb_build_object(
      'ok', false, 'reason', 'amount_mismatch', 'order_id', target.id
    );
  end if;

  was_failed := target.payment_status = 'failed';
  if was_failed then
    -- Lock every surviving product in a stable order before checking stock.
    perform p.id
      from public.products p
      join public.order_items oi on oi.product_id = p.id
     where oi.order_id = target.id
     order by p.id
     for update of p;

    select required.product_id, required.item_name
      into unavailable
      from (
        select oi.product_id,
               min(oi.name) as item_name,
               sum(oi.quantity)::integer as quantity
          from public.order_items oi
         where oi.order_id = target.id
         group by oi.product_id
      ) required
      left join public.products p on p.id = required.product_id
     where required.product_id is null
        or p.id is null
        or p.active is not true
        or p.stock < required.quantity
     limit 1;

    if found then
      return jsonb_build_object(
        'ok', false,
        'reason', 'out_of_stock',
        'order_id', target.id,
        'product_id', unavailable.product_id,
        'item_name', unavailable.item_name
      );
    end if;

    if not exists (
      select 1 from public.order_items oi where oi.order_id = target.id
    ) then
      return jsonb_build_object(
        'ok', false, 'reason', 'items_missing', 'order_id', target.id
      );
    end if;

    update public.products p
       set stock = p.stock - required.quantity
      from (
        select oi.product_id, sum(oi.quantity)::integer as quantity
          from public.order_items oi
         where oi.order_id = target.id
           and oi.product_id is not null
         group by oi.product_id
      ) required
     where p.id = required.product_id;
  end if;

  update public.orders
     set payment_status = 'paid',
         status = 'confirmed',
         razorpay_payment_id = p_razorpay_payment_id
   where id = target.id;

  return jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'recaptured', was_failed,
    'order_id', target.id
  );
end
$$;

create or replace function public.fail_razorpay_order_payment(
  p_razorpay_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders%rowtype;
begin
  select * into target
    from public.orders
   where razorpay_order_id = p_razorpay_order_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if target.payment_status <> 'pending' or target.status = 'cancelled' then
    return jsonb_build_object(
      'ok', true, 'updated', false, 'order_id', target.id
    );
  end if;

  update public.orders set payment_status = 'failed' where id = target.id;

  update public.products p
     set stock = p.stock + returned.quantity
    from (
      select oi.product_id, sum(oi.quantity)::integer as quantity
        from public.order_items oi
       where oi.order_id = target.id
         and oi.product_id is not null
       group by oi.product_id
    ) returned
   where p.id = returned.product_id;

  return jsonb_build_object(
    'ok', true, 'updated', true, 'order_id', target.id
  );
end
$$;

revoke execute on function public.confirm_razorpay_order_payment(text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.fail_razorpay_order_payment(text)
  from public, anon, authenticated;
grant execute on function public.confirm_razorpay_order_payment(text, text, integer)
  to service_role;
grant execute on function public.fail_razorpay_order_payment(text)
  to service_role;

-- Reassert the service-only grants for pre-existing mutating functions.
revoke execute on function public.decrement_stock(jsonb) from public, anon, authenticated;
revoke execute on function public.restore_stock(jsonb) from public, anon, authenticated;
revoke execute on function public.increment_coupon_usage(text) from public, anon, authenticated;
grant execute on function public.decrement_stock(jsonb) to service_role;
grant execute on function public.restore_stock(jsonb) to service_role;
grant execute on function public.increment_coupon_usage(text) to service_role;

-- ── Storage defence in depth ─────────────────────────────────────────
-- Converges both a missing and an existing bucket without weakening its
-- public-read behavior. Uploads remain application/service-role controlled.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ── Parameterized autocomplete search ───────────────────────────────
-- Keeps user text out of PostgREST filter grammar and returns only the six
-- fields the public autocomplete endpoint needs. The route rejects wildcard
-- metacharacters so they cannot broaden a search.
create or replace function public.search_product_autocomplete(
  p_query text,
  p_limit integer default 6
)
returns table (
  id uuid,
  name text,
  slug text,
  price integer,
  image_url text,
  category text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id,
         p.name,
         p.slug,
         p.price,
         p.images[1] as image_url,
         c.name as category
    from public.products p
    left join public.categories c on c.id = p.category_id
   where p.active = true
     and (
       p.name ilike '%' || p_query || '%'
       or p.description ilike '%' || p_query || '%'
     )
   order by p.featured desc, p.created_at desc
   limit least(greatest(p_limit, 1), 6)
$$;

revoke execute on function public.search_product_autocomplete(text, integer)
  from public;
grant execute on function public.search_product_autocomplete(text, integer)
  to anon, authenticated, service_role;
