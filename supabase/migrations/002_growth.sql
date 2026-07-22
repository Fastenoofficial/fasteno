-- ═══════════════════════════════════════════════════════════════════
-- Fasteno Shyama — migration 002: compliance, inventory, coupons,
-- newsletter, tracking, product image storage
-- ═══════════════════════════════════════════════════════════════════

-- ── Products: compliance fields ──────────────────────────────────────
alter table public.products
  add column if not exists country_of_origin text not null default 'India';
alter table public.products
  add column if not exists hsn_code text not null default '';

-- ── Orders: shipment tracking + coupon ───────────────────────────────
alter table public.orders add column if not exists courier      text;
alter table public.orders add column if not exists awb_number   text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists coupon_code  text;
alter table public.orders add column if not exists discount     int not null default 0; -- paise

-- ── Newsletter subscribers (DPDP: keep consent timestamp) ────────────
create table if not exists public.newsletter_subscribers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  consented_at timestamptz not null default now(),
  source       text not null default 'site'
);
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy "newsletter_public_insert" on public.newsletter_subscribers
  for insert with check (true);
drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select using (public.is_admin());

-- ── Coupons ──────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  type         text not null check (type in ('percent','flat')),
  value        int  not null check (value > 0),  -- percent (1-90) or paise
  min_subtotal int  not null default 0,          -- paise
  max_discount int,                              -- paise cap for percent type
  active       boolean not null default true,
  starts_at    timestamptz not null default now(),
  expires_at   timestamptz,
  usage_limit  int,
  used_count   int not null default 0,
  created_at   timestamptz not null default now()
);
alter table public.coupons enable row level security;
drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- validate a coupon server-side without exposing the table
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
  else
    v_discount := least(c.value, p_subtotal);
  end if;
  return jsonb_build_object('valid', true, 'code', c.code, 'type', c.type,
                            'value', c.value, 'discount', v_discount);
end;
$$;

create or replace function public.increment_coupon_usage(p_code text)
returns void
language sql
security definer set search_path = public
as $$
  update public.coupons set used_count = used_count + 1
   where upper(code) = upper(trim(p_code));
$$;

-- ── Atomic stock management ──────────────────────────────────────────
-- items: [{"product_id": "...", "quantity": 2}, ...]
-- Raises on insufficient stock so the caller's transaction aborts.
create or replace function public.decrement_stock(items jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare item jsonb;
declare updated int;
begin
  for item in select * from jsonb_array_elements(items) loop
    update public.products
       set stock = stock - (item->>'quantity')::int
     where id = (item->>'product_id')::uuid
       and stock >= (item->>'quantity')::int
       and active = true;
    get diagnostics updated = row_count;
    if updated = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', item->>'product_id';
    end if;
  end loop;
end;
$$;

create or replace function public.restore_stock(items jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare item jsonb;
begin
  for item in select * from jsonb_array_elements(items) loop
    update public.products
       set stock = stock + (item->>'quantity')::int
     where id = (item->>'product_id')::uuid;
  end loop;
end;
$$;

-- ── Product image storage bucket ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ── Welcome coupon so the engine has something to validate ───────────
insert into public.coupons (code, type, value, min_subtotal, max_discount)
values ('WELCOME10', 'percent', 10, 99900, 50000)
on conflict (code) do nothing;
