-- ── Shiprocket integration ────────────────────────────────────────────
-- Adds the Shiprocket-side identifiers to public.orders. courier /
-- awb_number / tracking_url already exist (002_growth) and stay the
-- single source of truth for what the customer sees — these columns hold
-- the ids we need to talk back to Shiprocket about an existing shipment.
--
-- All columns are nullable: orders shipped manually (or created before
-- this migration) simply leave them null, and the admin's hand-entered
-- courier/AWB flow keeps working untouched.

alter table public.orders
  add column if not exists shiprocket_order_id    text,
  add column if not exists shiprocket_shipment_id text,
  -- Latest status string as reported by Shiprocket, for admin display.
  add column if not exists shiprocket_status      text,
  -- When we last successfully synced status from Shiprocket.
  add column if not exists shiprocket_synced_at   timestamptz,
  -- Set when the order reaches a delivered state. The 7-day return window
  -- is measured from here rather than from the order date.
  add column if not exists delivered_at           timestamptz;

-- One Shiprocket order per store order. A partial unique index (rather than
-- a plain unique constraint) so the many nulls don't collide.
create unique index if not exists orders_shiprocket_order_id_key
  on public.orders (shiprocket_order_id)
  where shiprocket_order_id is not null;

create index if not exists orders_shiprocket_shipment_id_idx
  on public.orders (shiprocket_shipment_id)
  where shiprocket_shipment_id is not null;

-- The status poller scans for live shipments; keep that scan cheap.
create index if not exists orders_awb_active_idx
  on public.orders (status)
  where awb_number is not null and status = 'shipped';

-- ── Column privileges ─────────────────────────────────────────────────
-- 004_security_hardening revoked table-level UPDATE from anon/authenticated
-- and re-granted only specific columns. These new columns are written ONLY
-- by the server through the service-role client, so no grant is added here
-- on purpose — anon/authenticated must never write shipping identifiers.

comment on column public.orders.shiprocket_order_id is
  'Shiprocket order id (their "order_id"). Server/service-role writes only.';
comment on column public.orders.shiprocket_shipment_id is
  'Shiprocket shipment id — needed for AWB assignment and cancellation.';
comment on column public.orders.delivered_at is
  'Set when Shiprocket reports delivery; anchors the 7-day return window.';
