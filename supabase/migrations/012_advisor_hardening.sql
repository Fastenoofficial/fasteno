-- Security and performance advisor cleanup after migrations 001-011.
-- Additive roll-forward migration; do not edit applied history.

BEGIN;

-- Trigger-only: signup continues through the existing trigger, while API roles
-- cannot attempt to invoke the SECURITY DEFINER trigger function directly.
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated, service_role;

-- Public ratings remain approved-only and now execute with caller rights.
CREATE OR REPLACE FUNCTION public.product_rating(p_product_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    pg_catalog.jsonb_build_object(
      'count', pg_catalog.count(*),
      'average', pg_catalog.round(pg_catalog.avg(review.rating)::numeric, 1)
    ),
    '{"count":0,"average":0}'::jsonb
  )
  FROM public.reviews AS review
  WHERE review.product_id = p_product_id
    AND review.status = 'approved'
$$;
REVOKE ALL ON FUNCTION public.product_rating(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.product_rating(uuid)
  TO anon, authenticated;

-- Required public helpers retain only the API roles that call them.
REVOKE ALL ON FUNCTION public.is_admin()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin()
  TO anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_coupon(text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer)
  TO anon, authenticated;

-- Reassert the nine authenticated-only, in-body-admin-checked definer RPCs.
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
REVOKE ALL ON FUNCTION public.admin_manage_products(uuid[], text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_product_editor_state(
  uuid, uuid, boolean, boolean
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_duplicate_product(uuid)
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
GRANT EXECUTE ON FUNCTION public.admin_manage_products(uuid[], text, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_product_editor_state(
  uuid, uuid, boolean, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_product(uuid)
  TO authenticated;

-- Cover foreign-key lookup directions not served by existing leading keys.
CREATE INDEX IF NOT EXISTS order_items_product_id_idx
  ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS order_requests_user_id_idx
  ON public.order_requests (user_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx
  ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS site_banners_product_1_id_idx
  ON public.site_banners (product_1_id);
CREATE INDEX IF NOT EXISTS site_banners_product_2_id_idx
  ON public.site_banners (product_2_id);
CREATE INDEX IF NOT EXISTS wishlists_product_id_idx
  ON public.wishlists (product_id);

-- Cache auth helpers once per statement while retaining the exact policy scope.
DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;
CREATE POLICY "profiles_owner_read" ON public.profiles
  FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "addresses_owner_all" ON public.addresses;
CREATE POLICY "addresses_owner_all" ON public.addresses
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "orders_owner_read" ON public.orders;
CREATE POLICY "orders_owner_read" ON public.orders
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "order_items_owner_read" ON public.order_items;
CREATE POLICY "order_items_owner_read" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders AS parent_order
      WHERE parent_order.id = order_items.order_id
        AND (
          parent_order.user_id = (SELECT auth.uid())
          OR (SELECT public.is_admin())
        )
    )
  );

DROP POLICY IF EXISTS "wishlists_owner_all" ON public.wishlists;
CREATE POLICY "wishlists_owner_all" ON public.wishlists
  FOR ALL
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "reviews_public_read" ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT
  USING (
    status = 'approved'
    OR user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "reviews_owner_insert" ON public.reviews;
CREATE POLICY "reviews_owner_insert" ON public.reviews
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND verified = FALSE
  );

DROP POLICY IF EXISTS "reviews_owner_delete" ON public.reviews;
CREATE POLICY "reviews_owner_delete" ON public.reviews
  FOR DELETE
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "order_requests_owner_read" ON public.order_requests;
CREATE POLICY "order_requests_owner_read" ON public.order_requests
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "order_requests_owner_insert" ON public.order_requests;
CREATE POLICY "order_requests_owner_insert" ON public.order_requests
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.orders AS parent_order
      WHERE parent_order.id = order_requests.order_id
        AND parent_order.user_id = (SELECT auth.uid())
    )
  );

-- One SELECT policy preserves scheduled public reads and unrestricted admin
-- reads; structural writes remain separate admin-only policies.
DROP POLICY IF EXISTS "banners_public_read" ON public.site_banners;
DROP POLICY IF EXISTS "banners_admin_write" ON public.site_banners;
DROP POLICY IF EXISTS "banners_public_or_admin_read" ON public.site_banners;
DROP POLICY IF EXISTS "banners_admin_insert" ON public.site_banners;
DROP POLICY IF EXISTS "banners_admin_update" ON public.site_banners;
DROP POLICY IF EXISTS "banners_admin_delete" ON public.site_banners;

CREATE POLICY "banners_public_or_admin_read" ON public.site_banners
  FOR SELECT
  USING (
    (
      enabled IS TRUE
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    )
    OR (SELECT public.is_admin())
  );
CREATE POLICY "banners_admin_insert" ON public.site_banners
  FOR INSERT
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "banners_admin_update" ON public.site_banners
  FOR UPDATE
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "banners_admin_delete" ON public.site_banners
  FOR DELETE
  USING ((SELECT public.is_admin()));

-- Retain public settings reads and split the old admin FOR ALL policy into DML.
DROP POLICY IF EXISTS "site_settings_admin_write" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_delete" ON public.site_settings;
CREATE POLICY "site_settings_admin_insert" ON public.site_settings
  FOR INSERT
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "site_settings_admin_update" ON public.site_settings
  FOR UPDATE
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "site_settings_admin_delete" ON public.site_settings
  FOR DELETE
  USING ((SELECT public.is_admin()));

NOTIFY pgrst, 'reload schema';
COMMIT;
