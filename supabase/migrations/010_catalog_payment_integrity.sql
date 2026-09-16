-- ═══════════════════════════════════════════════════════════════════
-- Migration 010: catalog operation boundary + payment identifiers
--
-- 1. Keeps structural category and featured-order writes behind the locked,
--    admin-checked RPCs introduced in migrations 008 and 009.
-- 2. Restricts ordinary authenticated product writes to safe draft creation
--    and descriptive/editor fields; publication/category transitions remain
--    available only through migration 009's activity-logging RPCs.
-- 3. Rejects ambiguous Razorpay identifiers before adding one-to-one indexes
--    and makes capture confirmation detect payment-id reuse explicitly.
--
-- Apply only after deploying the matching application release. The migration
-- is transactional and intentionally aborts instead of changing commerce data
-- if duplicate non-null Razorpay identifiers already exist.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── Razorpay identifier integrity ───────────────────────────────────
-- Close the preflight/index race. For a large production orders table, run
-- this reviewed migration in a maintenance window rather than weakening the
-- check or silently repairing payment records.
LOCK TABLE public.orders IN SHARE ROW EXCLUSIVE MODE;

DO $razorpay_duplicate_preflight$
DECLARE
  duplicate_identifier record;
BEGIN
  SELECT orders.razorpay_order_id AS identifier, count(*)::integer AS occurrences
  INTO duplicate_identifier
  FROM public.orders AS orders
  WHERE orders.razorpay_order_id IS NOT NULL
  GROUP BY orders.razorpay_order_id
  HAVING count(*) > 1
  ORDER BY orders.razorpay_order_id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Duplicate Razorpay order ids prevent migration 010',
      DETAIL = pg_catalog.format(
        'Razorpay order id %L appears in %s local orders.',
        duplicate_identifier.identifier,
        duplicate_identifier.occurrences
      ),
      HINT = 'Reconcile the affected local orders and Razorpay records manually, then rerun migration 010.';
  END IF;

  SELECT orders.razorpay_payment_id AS identifier, count(*)::integer AS occurrences
  INTO duplicate_identifier
  FROM public.orders AS orders
  WHERE orders.razorpay_payment_id IS NOT NULL
  GROUP BY orders.razorpay_payment_id
  HAVING count(*) > 1
  ORDER BY orders.razorpay_payment_id
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Duplicate Razorpay payment ids prevent migration 010',
      DETAIL = pg_catalog.format(
        'Razorpay payment id %L appears in %s local orders.',
        duplicate_identifier.identifier,
        duplicate_identifier.occurrences
      ),
      HINT = 'Reconcile the affected local orders and Razorpay records manually, then rerun migration 010.';
  END IF;
END
$razorpay_duplicate_preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_key
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_key
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- Preserve migration 006's browser-compatible optional amount. The signed
-- webhook supplies an authoritative amount; the browser callback supplies the
-- signed order/payment pair and therefore still passes NULL here.
CREATE OR REPLACE FUNCTION public.confirm_razorpay_order_payment(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_captured_amount integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.orders%ROWTYPE;
  unavailable record;
  was_failed boolean;
BEGIN
  SELECT orders.*
  INTO target
  FROM public.orders AS orders
  WHERE orders.razorpay_order_id = p_razorpay_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;

  -- Webhook amounts are authoritative even when browser verification won the
  -- callback race and the same payment is already stored. Browser verification
  -- intentionally supplies NULL and therefore remains compatible.
  IF p_captured_amount IS NOT NULL AND p_captured_amount <> target.total THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', FALSE,
      'reason', 'amount_mismatch',
      'order_id', target.id
    );
  END IF;

  IF target.payment_status = 'paid' THEN
    IF target.razorpay_payment_id IS DISTINCT FROM p_razorpay_payment_id THEN
      RETURN pg_catalog.jsonb_build_object(
        'ok', FALSE,
        'reason', 'payment_id_mismatch',
        'order_id', target.id
      );
    END IF;

    RETURN pg_catalog.jsonb_build_object(
      'ok', TRUE,
      'already_paid', TRUE,
      'order_id', target.id
    );
  END IF;

  IF target.status = 'cancelled' THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', FALSE,
      'reason', 'order_cancelled',
      'order_id', target.id
    );
  END IF;

  IF target.payment_status NOT IN ('pending', 'failed') THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', FALSE,
      'reason', 'invalid_state',
      'order_id', target.id
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.orders AS other_order
    WHERE other_order.razorpay_payment_id = p_razorpay_payment_id
      AND other_order.id <> target.id
  ) THEN
    RETURN pg_catalog.jsonb_build_object(
      'ok', FALSE,
      'reason', 'payment_id_conflict',
      'order_id', target.id
    );
  END IF;

  -- This exception block is a subtransaction. If a concurrent order wins the
  -- unique payment-id race, any failed-payment stock re-reservation below is
  -- rolled back before a permanent reconciliation result is returned.
  BEGIN
    was_failed := target.payment_status = 'failed';
    IF was_failed THEN
      PERFORM product.id
      FROM public.products AS product
      JOIN public.order_items AS order_item
        ON order_item.product_id = product.id
      WHERE order_item.order_id = target.id
      ORDER BY product.id
      FOR UPDATE OF product;

      SELECT required.product_id, required.item_name
      INTO unavailable
      FROM (
        SELECT order_item.product_id,
               min(order_item.name) AS item_name,
               sum(order_item.quantity)::integer AS quantity
        FROM public.order_items AS order_item
        WHERE order_item.order_id = target.id
        GROUP BY order_item.product_id
      ) AS required
      LEFT JOIN public.products AS product ON product.id = required.product_id
      WHERE required.product_id IS NULL
         OR product.id IS NULL
         OR product.active IS NOT TRUE
         OR product.stock < required.quantity
      LIMIT 1;

      IF FOUND THEN
        RETURN pg_catalog.jsonb_build_object(
          'ok', FALSE,
          'reason', 'out_of_stock',
          'order_id', target.id,
          'product_id', unavailable.product_id,
          'item_name', unavailable.item_name
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.order_items AS order_item
        WHERE order_item.order_id = target.id
      ) THEN
        RETURN pg_catalog.jsonb_build_object(
          'ok', FALSE,
          'reason', 'items_missing',
          'order_id', target.id
        );
      END IF;

      UPDATE public.products AS product
      SET stock = product.stock - required.quantity
      FROM (
        SELECT order_item.product_id,
               sum(order_item.quantity)::integer AS quantity
        FROM public.order_items AS order_item
        WHERE order_item.order_id = target.id
          AND order_item.product_id IS NOT NULL
        GROUP BY order_item.product_id
      ) AS required
      WHERE product.id = required.product_id;
    END IF;

    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        razorpay_payment_id = p_razorpay_payment_id
    WHERE id = target.id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN pg_catalog.jsonb_build_object(
        'ok', FALSE,
        'reason', 'payment_id_conflict',
        'order_id', target.id
      );
  END;

  RETURN pg_catalog.jsonb_build_object(
    'ok', TRUE,
    'already_paid', FALSE,
    'recaptured', was_failed,
    'order_id', target.id
  );
END
$$;

REVOKE ALL ON FUNCTION public.confirm_razorpay_order_payment(text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_razorpay_order_payment(text, text, integer)
  TO service_role;

-- ── Guard structural catalog writes behind RPCs ─────────────────────
-- Migration 008 originally used invoker rights while authenticated admins had
-- broad table DML. Convert only its explicitly admin-checked, empty-search-path
-- mutators before narrowing those grants; their signatures and callers stay
-- unchanged.
ALTER FUNCTION public.reorder_categories(uuid[]) SECURITY DEFINER;
ALTER FUNCTION public.create_category(text, text, text, text, boolean)
  SECURITY DEFINER;
ALTER FUNCTION public.delete_category(uuid) SECURITY DEFINER;
ALTER FUNCTION public.move_category(uuid, integer) SECURITY DEFINER;
ALTER FUNCTION public.reorder_featured_products(uuid[]) SECURITY DEFINER;
ALTER FUNCTION public.move_featured_product(uuid, integer) SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.reorder_categories(uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_category(text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_category(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.move_category(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reorder_featured_products(uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.move_featured_product(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_category(text, text, text, text, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_category(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_category(uuid, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_featured_products(uuid[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_featured_product(uuid, integer)
  TO authenticated;

-- Category metadata remains directly editable by an authenticated admin.
-- Creation, deletion, and sort_order changes now require the RPCs above.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.categories
  FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, slug, description, image_url, display_on_home)
  ON TABLE public.categories TO authenticated;

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
CREATE POLICY "categories_admin_update" ON public.categories
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- New products can be inserted only as unfeatured, inactive drafts. Ordinary
-- editor fields remain directly writable by admins; category/publication and
-- featured-order transitions are reserved for migration 009's locked RPCs.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.products
  FROM PUBLIC, anon, authenticated;

GRANT INSERT (
  slug,
  name,
  category_id,
  price,
  compare_at_price,
  description,
  details,
  material,
  color,
  pattern,
  tags,
  images,
  stock,
  active,
  country_of_origin,
  hsn_code,
  meta_title,
  meta_description
) ON TABLE public.products TO authenticated;

GRANT UPDATE (
  slug,
  name,
  price,
  compare_at_price,
  description,
  details,
  material,
  color,
  pattern,
  tags,
  images,
  stock,
  country_of_origin,
  hsn_code,
  meta_title,
  meta_description
) ON TABLE public.products TO authenticated;

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND active IS FALSE
    AND featured IS FALSE
    AND featured_order = 0
  );

DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

-- Migration 008's unique partial index covers the same scan/order use as the
-- older migration-002 non-unique index, so retain only the stronger index.
CREATE UNIQUE INDEX IF NOT EXISTS products_featured_order_unique_idx
  ON public.products (featured_order)
  WHERE featured IS TRUE;
DROP INDEX IF EXISTS public.products_featured_order_idx;

-- Supersede migration 005's historical privilege wording without rewriting an
-- applied migration. Application synchronization uses service_role; direct
-- authenticated table updates are separately limited to admins by order RLS.
COMMENT ON COLUMN public.orders.shiprocket_order_id IS
  'Application Shiprocket synchronization writes through service_role; authenticated table updates remain restricted to administrators by RLS.';
COMMENT ON COLUMN public.orders.shiprocket_shipment_id IS
  'Shiprocket shipment id used by server synchronization; authenticated table updates remain restricted to administrators by RLS.';

COMMIT;
