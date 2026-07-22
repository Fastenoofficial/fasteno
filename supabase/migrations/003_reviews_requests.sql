-- ═══════════════════════════════════════════════════════════════════
-- Migration 003: reviews, order self-service requests, site settings,
-- product SEO fields, free-shipping coupons
-- ═══════════════════════════════════════════════════════════════════

-- ── Product reviews ──────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  rating      int  not null check (rating between 1 and 5),
  title       text not null default '',
  body        text not null default '',
  verified    boolean not null default false,  -- purchased this product
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected')),
  admin_reply text,
  created_at  timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.reviews(product_id, status);
alter table public.reviews enable row level security;
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
  for select using (status = 'approved' or auth.uid() = user_id or public.is_admin());
drop policy if exists "reviews_owner_insert" on public.reviews;
create policy "reviews_owner_insert" on public.reviews
  for insert with check (auth.uid() = user_id);
drop policy if exists "reviews_admin_update" on public.reviews;
create policy "reviews_admin_update" on public.reviews
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "reviews_owner_delete" on public.reviews;
create policy "reviews_owner_delete" on public.reviews
  for delete using (auth.uid() = user_id or public.is_admin());

-- rating aggregate used by PDP + JSON-LD
create or replace function public.product_rating(p_product_id uuid)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    jsonb_build_object(
      'count', count(*),
      'average', round(avg(rating)::numeric, 1)
    ), '{"count":0,"average":0}'::jsonb)
  from public.reviews
  where product_id = p_product_id and status = 'approved';
$$;

-- ── Order self-service requests (cancel / return / replace) ─────────
create table if not exists public.order_requests (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  type        text not null check (type in ('cancel','return','replace')),
  reason      text not null default '',
  status      text not null default 'requested'
              check (status in ('requested','approved','rejected','completed')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists order_requests_order_idx on public.order_requests(order_id);
alter table public.order_requests enable row level security;
drop policy if exists "order_requests_owner_read" on public.order_requests;
create policy "order_requests_owner_read" on public.order_requests
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "order_requests_owner_insert" on public.order_requests;
create policy "order_requests_owner_insert" on public.order_requests
  for insert with check (
    auth.uid() = user_id and
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
drop policy if exists "order_requests_admin_update" on public.order_requests;
create policy "order_requests_admin_update" on public.order_requests
  for update using (public.is_admin()) with check (public.is_admin());

-- ── Site settings (announcement bar, delivery promise, …) ────────────
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings
  for select using (true);
drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (key, value) values
  ('announcement', '{"enabled": false, "text": "", "href": ""}'::jsonb),
  ('delivery', '{"dispatchHours": 24, "minDays": 3, "maxDays": 7}'::jsonb)
on conflict (key) do nothing;

-- ── Product SEO fields ───────────────────────────────────────────────
alter table public.products add column if not exists meta_title text not null default '';
alter table public.products add column if not exists meta_description text not null default '';

-- ── Free-shipping coupon type ────────────────────────────────────────
alter table public.coupons drop constraint if exists coupons_type_check;
alter table public.coupons add constraint coupons_type_check
  check (type in ('percent','flat','free_shipping'));
alter table public.coupons drop constraint if exists coupons_value_check;
alter table public.coupons add constraint coupons_value_check check (value >= 0);

create or replace function public.validate_coupon(p_code text, p_subtotal int)
returns jsonb
language plpgsql
security definer set search_path = public
stable
as $$
declare c public.coupons%rowtype;
declare v_discount int;
begin
  select * into c from public.coupons
   where upper(code) = upper(trim(p_code)) and active = true;
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Invalid code');
  end if;
  if c.starts_at > now() then
    return jsonb_build_object('valid', false, 'reason', 'Code not active yet');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'Code has expired');
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'reason', 'Code fully redeemed');
  end if;
  if p_subtotal < c.min_subtotal then
    return jsonb_build_object('valid', false, 'reason', 'Order below minimum for this code',
                              'minSubtotal', c.min_subtotal);
  end if;
  if c.type = 'percent' then
    v_discount := (p_subtotal * c.value) / 100;
    if c.max_discount is not null and v_discount > c.max_discount then
      v_discount := c.max_discount;
    end if;
  elsif c.type = 'flat' then
    v_discount := least(c.value, p_subtotal);
  else
    v_discount := 0;  -- free_shipping: checkout waives the shipping fee
  end if;
  return jsonb_build_object('valid', true, 'code', c.code, 'type', c.type,
                            'value', c.value, 'discount', v_discount);
end;
$$;
