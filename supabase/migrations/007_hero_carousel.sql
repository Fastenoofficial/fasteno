-- Hero carousel scheduling and product callouts.
-- Additive and safe to re-run after 006_security_hardening.sql.

BEGIN;

ALTER TABLE public.site_banners
  ADD COLUMN IF NOT EXISTS product_1_id uuid,
  ADD COLUMN IF NOT EXISTS product_2_id uuid,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.site_banners'::regclass
      AND conname = 'site_banners_product_1_id_fkey'
  ) THEN
    ALTER TABLE public.site_banners
      ADD CONSTRAINT site_banners_product_1_id_fkey
      FOREIGN KEY (product_1_id)
      REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.site_banners'::regclass
      AND conname = 'site_banners_product_2_id_fkey'
  ) THEN
    ALTER TABLE public.site_banners
      ADD CONSTRAINT site_banners_product_2_id_fkey
      FOREIGN KEY (product_2_id)
      REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.site_banners'::regclass
      AND conname = 'site_banners_end_after_start'
  ) THEN
    ALTER TABLE public.site_banners
      ADD CONSTRAINT site_banners_end_after_start
      CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);
  END IF;
END
$$;

-- Supports deterministic reads by placement and editorial order. Scheduling
-- remains nullable, so existing banners continue to be in-window.
CREATE INDEX IF NOT EXISTS site_banners_active_location_order_idx
  ON public.site_banners (location, sort_order ASC NULLS LAST, created_at ASC NULLS LAST, id)
  WHERE enabled IS TRUE;

-- Public visitors only see enabled banners inside their optional schedule.
-- The existing banners_admin_write policy remains unchanged, retaining full
-- administrator access (including disabled, scheduled, and expired rows).
DROP POLICY IF EXISTS "banners_public_read" ON public.site_banners;
CREATE POLICY "banners_public_read" ON public.site_banners
  FOR SELECT
  USING (
    enabled IS TRUE
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

-- Apply a complete location order in one transaction. SECURITY INVOKER keeps
-- the existing admin RLS policy authoritative; non-admin updates still fail.
CREATE OR REPLACE FUNCTION public.reorder_site_banners(
  p_location text,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  expected_count integer;
  supplied_count integer;
  distinct_count integer;
  updated_count integer;
BEGIN
  IF p_location NOT IN ('home-hero', 'category-header', 'promo-bar') THEN
    RAISE EXCEPTION 'Invalid banner location';
  END IF;
  IF p_ordered_ids IS NULL OR cardinality(p_ordered_ids) = 0 THEN
    RAISE EXCEPTION 'Banner order cannot be empty';
  END IF;

  -- Serialize reorders for this location before checking the complete set.
  PERFORM banner.id
  FROM public.site_banners AS banner
  WHERE banner.location = p_location
  ORDER BY banner.sort_order ASC NULLS LAST,
           banner.created_at ASC NULLS LAST,
           banner.id ASC
  FOR UPDATE;

  SELECT count(*)
  INTO expected_count
  FROM public.site_banners AS banner
  WHERE banner.location = p_location;

  SELECT count(*), count(DISTINCT supplied.id)
  INTO supplied_count, distinct_count
  FROM unnest(p_ordered_ids) AS supplied(id);

  IF supplied_count <> expected_count OR distinct_count <> expected_count THEN
    RAISE EXCEPTION 'Banner order must contain each location banner exactly once';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM unnest(p_ordered_ids) AS supplied(id)
    LEFT JOIN public.site_banners AS banner
      ON banner.id = supplied.id AND banner.location = p_location
    WHERE banner.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Banner order contains an invalid banner';
  END IF;

  UPDATE public.site_banners AS banner
  SET sort_order = (supplied.position - 1)::integer
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS supplied(id, position)
  WHERE banner.id = supplied.id
    AND banner.location = p_location;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> expected_count THEN
    RAISE EXCEPTION 'Banner order update was incomplete';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_site_banners(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_site_banners(text, uuid[]) TO authenticated;

COMMIT;
