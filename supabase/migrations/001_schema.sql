-- ═══════════════════════════════════════════════════════════════════
-- Fasteno Shyama — schema + RLS
-- Run this in the Supabase SQL Editor (or `supabase db push`).
-- ═══════════════════════════════════════════════════════════════════

-- ── Categories ───────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text default '',
  sort_order  int  not null default 0
);

-- ── Products ─────────────────────────────────────────────────────────
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  category_id      uuid not null references public.categories(id),
  price            int  not null check (price >= 0),          -- paise
  compare_at_price int  check (compare_at_price >= 0),        -- paise
  description      text not null default '',
  details          jsonb not null default '[]'::jsonb,        -- string[]
  material         text not null default '',
  color            text not null default '',
  pattern          text not null default 'solid'
                   check (pattern in ('solid','striped','textured','printed')),
  tags             text[] not null default '{}',
  images           text[] not null default '{}',
  stock            int  not null default 0 check (stock >= 0),
  featured         boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx   on public.products(active);

-- ── Profiles (1:1 with auth.users) ───────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Addresses ────────────────────────────────────────────────────────
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  phone      text not null,
  line1      text not null,
  line2      text,
  city       text not null,
  state      text not null,
  pincode    text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses(user_id);

-- ── Orders ───────────────────────────────────────────────────────────
create sequence if not exists public.order_number_seq start 10001;

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique
                      default 'FS-' || nextval('public.order_number_seq'),
  user_id             uuid references auth.users(id) on delete set null,
  email               text not null,
  phone               text not null,
  shipping_address    jsonb not null,
  subtotal            int not null check (subtotal >= 0),
  shipping_fee        int not null default 0,
  total               int not null check (total >= 0),
  payment_method      text not null check (payment_method in ('razorpay','cod','demo')),
  payment_status      text not null default 'pending'
                      check (payment_status in ('pending','paid','failed','refunded')),
  razorpay_order_id   text,
  razorpay_payment_id text,
  status              text not null default 'pending'
                      check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at          timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name       text not null,
  price      int not null,
  quantity   int not null check (quantity > 0),
  image      text not null default ''
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ── Wishlists ────────────────────────────────────────────────────────
create table if not exists public.wishlists (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.addresses   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlists   enable row level security;

-- categories: public read, admin write
create policy "categories_public_read" on public.categories
  for select using (true);
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products: public read (active), admin everything
create policy "products_public_read" on public.products
  for select using (active = true or public.is_admin());
create policy "products_admin_write" on public.products
  for insert with check (public.is_admin());
create policy "products_admin_update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());
create policy "products_admin_delete" on public.products
  for delete using (public.is_admin());

-- profiles: owner read/update; admin read all
create policy "profiles_owner_read" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- addresses: owner CRUD
create policy "addresses_owner_all" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- orders: owner read; guests handled via server routes; admin read/update
create policy "orders_owner_read" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
create policy "orders_owner_insert" on public.orders
  for insert with check (auth.uid() = user_id or user_id is null);
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- order_items: readable with their order; insert alongside order creation
create policy "order_items_owner_read" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null)
    )
  );

-- wishlists: owner CRUD
create policy "wishlists_owner_all" on public.wishlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- To make yourself admin after signing up:
--   update public.profiles set role = 'admin' where id = (
--     select id from auth.users where email = 'you@example.com');
-- ═══════════════════════════════════════════════════════════════════
