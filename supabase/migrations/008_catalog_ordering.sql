-- Deterministic, collision-safe category and featured-product ordering.
-- Apply once after 007_hero_carousel.sql and deploy the matching admin actions
-- at the same time because they use the RPCs defined below.

BEGIN;

-- Block concurrent editorial writes while legacy values are normalized and the
-- uniqueness guarantees are installed.
LOCK TABLE public.categories IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.products IN SHARE ROW EXCLUSIVE MODE;

-- Preserve the existing deterministic category order while removing legacy
-- duplicates and gaps.
WITH ranked_categories AS (
  SELECT category.id,
         (row_number() OVER (
           ORDER BY category.sort_order ASC, category.id ASC
         ) - 1)::integer AS normalized_order
  FROM public.categories AS category
)
UPDATE public.categories AS category
SET sort_order = ranked.normalized_order
FROM ranked_categories AS ranked
WHERE category.id = ranked.id
  AND category.sort_order IS DISTINCT FROM ranked.normalized_order;

UPDATE public.categories
SET display_on_home = TRUE
WHERE display_on_home IS NULL;

ALTER TABLE public.categories
  ALTER COLUMN display_on_home SET DEFAULT TRUE,
  ALTER COLUMN display_on_home SET NOT NULL;

-- Keep inactive featured legacy rows in the editorial set, but make all
-- positions deterministic. Non-featured rows never retain a stale position.
WITH ranked_featured AS (
  SELECT product.id,
         (row_number() OVER (
           ORDER BY product.featured_order ASC NULLS LAST,
                    product.created_at ASC,
                    product.id ASC
         ) - 1)::integer AS normalized_order
  FROM public.products AS product
  WHERE product.featured IS TRUE
)
UPDATE public.products AS product
SET featured_order = ranked.normalized_order
FROM ranked_featured AS ranked
WHERE product.id = ranked.id
  AND product.featured_order IS DISTINCT FROM ranked.normalized_order;

UPDATE public.products
SET featured_order = 0
WHERE featured IS NOT TRUE
   OR featured_order IS NULL
   OR featured_order < 0;

ALTER TABLE public.products
  ALTER COLUMN featured_order SET DEFAULT 0,
  ALTER COLUMN featured_order SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND conname = 'categories_sort_order_nonnegative'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_sort_order_nonnegative
      CHECK (sort_order >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_featured_order_nonnegative'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_featured_order_nonnegative
      CHECK (featured_order >= 0);
  END IF;
END
$$;

-- Unknown/direct writers now fail closed instead of silently creating an
-- ambiguous editorial order. RPCs stage rows above the current maximum before
-- assigning final positions, so swaps remain compatible with these indexes.
CREATE UNIQUE INDEX IF NOT EXISTS categories_sort_order_unique_idx
  ON public.categories (sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS products_featured_order_unique_idx
  ON public.products (featured_order)
  WHERE featured IS TRUE;

-- Apply a complete category order atomically. SECURITY INVOKER keeps RLS
-- authoritative; the explicit admin check provides clearer denial semantics.
CREATE OR REPLACE FUNCTION public.reorder_categories(p_ordered_ids uuid[])
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
  stage_offset integer;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;
  IF p_ordered_ids IS NULL THEN
    RAISE EXCEPTION 'Category order is required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);

  PERFORM category.id
  FROM public.categories AS category
  ORDER BY category.sort_order ASC, category.id ASC
  FOR UPDATE;

  SELECT count(*)::integer,
         COALESCE(max(category.sort_order), -1) + count(*)::integer + 1
  INTO expected_count, stage_offset
  FROM public.categories AS category;

  SELECT count(*)::integer, count(DISTINCT supplied.id)::integer
  INTO supplied_count, distinct_count
  FROM unnest(p_ordered_ids) AS supplied(id);

  IF supplied_count <> expected_count OR distinct_count <> expected_count THEN
    RAISE EXCEPTION 'Category order must contain each category exactly once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_ordered_ids) AS supplied(id)
    LEFT JOIN public.categories AS category ON category.id = supplied.id
    WHERE category.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Category order contains an invalid category';
  END IF;

  IF expected_count > 0 THEN
    UPDATE public.categories
    SET sort_order = sort_order + stage_offset;

    UPDATE public.categories AS category
    SET sort_order = (supplied.position - 1)::integer
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS supplied(id, position)
    WHERE category.id = supplied.id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> expected_count THEN
      RAISE EXCEPTION 'Category order update was incomplete';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_categories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[]) TO authenticated;

-- New categories append under the same lock used by moves and deletion. This
-- removes the collision-prone raw sort-order field from the application form.
CREATE OR REPLACE FUNCTION public.create_category(
  p_name text,
  p_slug text,
  p_description text,
  p_image_url text,
  p_display_on_home boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  next_order integer;
  created_id uuid;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);

  PERFORM category.id
  FROM public.categories AS category
  ORDER BY category.sort_order ASC, category.id ASC
  FOR UPDATE;

  SELECT COALESCE(max(category.sort_order), -1) + 1
  INTO next_order
  FROM public.categories AS category;

  INSERT INTO public.categories (
    name,
    slug,
    description,
    image_url,
    display_on_home,
    sort_order
  ) VALUES (
    p_name,
    p_slug,
    COALESCE(p_description, ''),
    p_image_url,
    COALESCE(p_display_on_home, TRUE),
    next_order
  )
  RETURNING id INTO created_id;

  RETURN created_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_category(text, text, text, text, boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_category(text, text, text, text, boolean)
  TO authenticated;

-- Delete an empty category and compact the remaining positions in the same
-- transaction. The deleted slug is returned for precise cache invalidation.
CREATE OR REPLACE FUNCTION public.delete_category(p_category_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  deleted_slug text;
  remaining_count integer;
  stage_offset integer;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);

  PERFORM category.id
  FROM public.categories AS category
  ORDER BY category.sort_order ASC, category.id ASC
  FOR UPDATE;

  SELECT category.slug
  INTO deleted_slug
  FROM public.categories AS category
  WHERE category.id = p_category_id;

  IF deleted_slug IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Category not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.category_id = p_category_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Category still contains products';
  END IF;

  DELETE FROM public.categories
  WHERE id = p_category_id;

  SELECT count(*)::integer,
         COALESCE(max(category.sort_order), -1) + count(*)::integer + 1
  INTO remaining_count, stage_offset
  FROM public.categories AS category;

  IF remaining_count > 0 THEN
    UPDATE public.categories
    SET sort_order = sort_order + stage_offset;

    WITH ranked AS (
      SELECT category.id,
             (row_number() OVER (
               ORDER BY category.sort_order ASC, category.id ASC
             ) - 1)::integer AS final_order
      FROM public.categories AS category
    )
    UPDATE public.categories AS category
    SET sort_order = ranked.final_order
    FROM ranked
    WHERE category.id = ranked.id;
  END IF;

  RETURN deleted_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_category(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_category(uuid) TO authenticated;

-- Move one category relative to its current neighbour while the database lock
-- is held, avoiding stale full-order arrays computed in application code.
CREATE OR REPLACE FUNCTION public.move_category(
  p_category_id uuid,
  p_direction integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  category_count integer;
  current_order integer;
  target_id uuid;
  target_order integer;
  stage_offset integer;
  temporary_order integer;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;
  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Direction must be -1 or 1';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);

  PERFORM category.id
  FROM public.categories AS category
  ORDER BY category.sort_order ASC, category.id ASC
  FOR UPDATE;

  -- Normalize first so even legacy gaps cannot make a neighbour disappear.
  SELECT count(*)::integer,
         COALESCE(max(category.sort_order), -1) + count(*)::integer + 1
  INTO category_count, stage_offset
  FROM public.categories AS category;

  IF category_count > 0 THEN
    UPDATE public.categories
    SET sort_order = sort_order + stage_offset;

    WITH ranked AS (
      SELECT category.id,
             (row_number() OVER (
               ORDER BY category.sort_order ASC, category.id ASC
             ) - 1)::integer AS final_order
      FROM public.categories AS category
    )
    UPDATE public.categories AS category
    SET sort_order = ranked.final_order
    FROM ranked
    WHERE category.id = ranked.id;
  END IF;

  SELECT category.sort_order
  INTO current_order
  FROM public.categories AS category
  WHERE category.id = p_category_id;

  IF current_order IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Category not found';
  END IF;

  SELECT category.id, category.sort_order
  INTO target_id, target_order
  FROM public.categories AS category
  WHERE category.sort_order = current_order + p_direction;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Category cannot move any farther';
  END IF;

  temporary_order := category_count + 1;
  UPDATE public.categories SET sort_order = temporary_order
  WHERE id = p_category_id;
  UPDATE public.categories SET sort_order = current_order
  WHERE id = target_id;
  UPDATE public.categories SET sort_order = target_order
  WHERE id = p_category_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_category(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_category(uuid, integer) TO authenticated;

-- Apply the complete featured set order atomically. The scope includes inactive
-- legacy featured rows so hidden rows cannot invalidate an admin reorder.
CREATE OR REPLACE FUNCTION public.reorder_featured_products(
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
  stage_offset integer;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;
  IF p_ordered_ids IS NULL THEN
    RAISE EXCEPTION 'Featured product order is required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 2);

  PERFORM product.id
  FROM public.products AS product
  WHERE product.featured IS TRUE
  ORDER BY product.featured_order ASC,
           product.created_at ASC,
           product.id ASC
  FOR UPDATE;

  SELECT count(*)::integer,
         COALESCE(max(product.featured_order), -1) + count(*)::integer + 1
  INTO expected_count, stage_offset
  FROM public.products AS product
  WHERE product.featured IS TRUE;

  SELECT count(*)::integer, count(DISTINCT supplied.id)::integer
  INTO supplied_count, distinct_count
  FROM unnest(p_ordered_ids) AS supplied(id);

  IF supplied_count <> expected_count OR distinct_count <> expected_count THEN
    RAISE EXCEPTION 'Featured order must contain each featured product exactly once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_ordered_ids) AS supplied(id)
    LEFT JOIN public.products AS product
      ON product.id = supplied.id AND product.featured IS TRUE
    WHERE product.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Featured order contains an invalid product';
  END IF;

  IF expected_count > 0 THEN
    UPDATE public.products
    SET featured_order = featured_order + stage_offset
    WHERE featured IS TRUE;

    UPDATE public.products AS product
    SET featured_order = (supplied.position - 1)::integer
    FROM unnest(p_ordered_ids) WITH ORDINALITY AS supplied(id, position)
    WHERE product.id = supplied.id
      AND product.featured IS TRUE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> expected_count THEN
      RAISE EXCEPTION 'Featured order update was incomplete';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_featured_products(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_featured_products(uuid[])
  TO authenticated;

-- Membership changes share the featured-order lock. Existing rows retain their
-- relative order, additions append in supplied order, and removals compact the
-- survivors. Only active products may newly enter the featured set.
CREATE OR REPLACE FUNCTION public.set_products_featured(
  p_product_ids uuid[],
  p_featured boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  supplied_count integer;
  distinct_count integer;
  target_count integer;
  featured_count integer;
  updated_count integer;
  next_order integer;
  stage_offset integer;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;
  IF p_product_ids IS NULL OR cardinality(p_product_ids) = 0 THEN
    RAISE EXCEPTION 'At least one product is required';
  END IF;
  IF p_featured IS NULL THEN
    RAISE EXCEPTION 'Featured state is required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 2);

  PERFORM product.id
  FROM public.products AS product
  WHERE product.featured IS TRUE OR product.id = ANY(p_product_ids)
  ORDER BY product.id ASC
  FOR UPDATE;

  SELECT count(*)::integer, count(DISTINCT supplied.id)::integer
  INTO supplied_count, distinct_count
  FROM unnest(p_product_ids) AS supplied(id);

  SELECT count(*)::integer
  INTO target_count
  FROM public.products AS product
  WHERE product.id = ANY(p_product_ids);

  IF supplied_count <> distinct_count OR target_count <> supplied_count THEN
    RAISE EXCEPTION 'Products must be valid and unique';
  END IF;

  IF p_featured AND EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = ANY(p_product_ids)
      AND product.active IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Only active products can be featured';
  END IF;

  IF p_featured THEN
    SELECT COALESCE(max(product.featured_order), -1) + 1
    INTO next_order
    FROM public.products AS product
    WHERE product.featured IS TRUE;

    WITH additions AS (
      SELECT supplied.id,
             (row_number() OVER (ORDER BY supplied.position) - 1)::integer
               AS append_offset
      FROM unnest(p_product_ids) WITH ORDINALITY AS supplied(id, position)
      JOIN public.products AS product ON product.id = supplied.id
      WHERE product.featured IS NOT TRUE
    )
    UPDATE public.products AS product
    SET featured_order = next_order + additions.append_offset,
        featured = TRUE
    FROM additions
    WHERE product.id = additions.id;
  ELSE
    UPDATE public.products AS product
    SET featured = FALSE,
        featured_order = 0
    WHERE product.id = ANY(p_product_ids);
  END IF;

  -- Compact after either operation so this RPC repairs any historical gaps as
  -- well as applying the requested membership transition.
  SELECT count(*)::integer,
         COALESCE(max(product.featured_order), -1) + count(*)::integer + 1
  INTO featured_count, stage_offset
  FROM public.products AS product
  WHERE product.featured IS TRUE;

  IF featured_count > 0 THEN
    UPDATE public.products
    SET featured_order = featured_order + stage_offset
    WHERE featured IS TRUE;

    WITH ranked AS (
      SELECT product.id,
             (row_number() OVER (
               ORDER BY product.featured_order ASC,
                        product.created_at ASC,
                        product.id ASC
             ) - 1)::integer AS final_order
      FROM public.products AS product
      WHERE product.featured IS TRUE
    )
    UPDATE public.products AS product
    SET featured_order = ranked.final_order
    FROM ranked
    WHERE product.id = ranked.id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> featured_count THEN
      RAISE EXCEPTION 'Featured product update was incomplete';
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_products_featured(uuid[], boolean)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_products_featured(uuid[], boolean)
  TO authenticated;

-- Move one featured product relative to its neighbour entirely inside the
-- locked transaction, preventing stale browser reads from overwriting a newer
-- editorial order.
CREATE OR REPLACE FUNCTION public.move_featured_product(
  p_product_id uuid,
  p_direction integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  featured_count integer;
  current_order integer;
  target_id uuid;
  target_order integer;
  stage_offset integer;
  temporary_order integer;
BEGIN
  IF NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Admin access required';
  END IF;
  IF p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Direction must be -1 or 1';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 2);

  PERFORM product.id
  FROM public.products AS product
  WHERE product.featured IS TRUE
  ORDER BY product.featured_order ASC,
           product.created_at ASC,
           product.id ASC
  FOR UPDATE;

  SELECT count(*)::integer,
         COALESCE(max(product.featured_order), -1) + count(*)::integer + 1
  INTO featured_count, stage_offset
  FROM public.products AS product
  WHERE product.featured IS TRUE;

  IF featured_count > 0 THEN
    UPDATE public.products
    SET featured_order = featured_order + stage_offset
    WHERE featured IS TRUE;

    WITH ranked AS (
      SELECT product.id,
             (row_number() OVER (
               ORDER BY product.featured_order ASC,
                        product.created_at ASC,
                        product.id ASC
             ) - 1)::integer AS final_order
      FROM public.products AS product
      WHERE product.featured IS TRUE
    )
    UPDATE public.products AS product
    SET featured_order = ranked.final_order
    FROM ranked
    WHERE product.id = ranked.id;
  END IF;

  SELECT product.featured_order
  INTO current_order
  FROM public.products AS product
  WHERE product.id = p_product_id
    AND product.featured IS TRUE;

  IF current_order IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Featured product not found';
  END IF;

  SELECT product.id, product.featured_order
  INTO target_id, target_order
  FROM public.products AS product
  WHERE product.featured IS TRUE
    AND product.featured_order = current_order + p_direction;

  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Featured product cannot move any farther';
  END IF;

  temporary_order := featured_count + 1;
  UPDATE public.products SET featured_order = temporary_order
  WHERE id = p_product_id;
  UPDATE public.products SET featured_order = current_order
  WHERE id = target_id;
  UPDATE public.products SET featured_order = target_order
  WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_featured_product(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_featured_product(uuid, integer)
  TO authenticated;

COMMIT;
