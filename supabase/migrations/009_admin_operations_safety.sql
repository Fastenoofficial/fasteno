-- Atomic product administration, immutable activity history, and safe
-- duplication defaults. Apply once after 008_catalog_ordering.sql and deploy
-- the matching admin application code at the same time.

BEGIN;

-- Activity rows contain only allowlisted operational context. The actor and
-- timestamp are overwritten by a database trigger, so callers cannot attribute
-- an event to another administrator or backdate it.
CREATE TABLE IF NOT EXISTS public.admin_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN (
    'product.duplicate',
    'product.archive',
    'product.activate',
    'product.deactivate',
    'product.feature',
    'product.unfeature',
    'product.category_change'
  )),
  target_ids uuid[] NOT NULL CHECK (
    cardinality(target_ids) BETWEEN 1 AND 500
  ),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_activity_occurred_at_idx
  ON public.admin_activity (occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS admin_activity_actor_idx
  ON public.admin_activity (actor_id, occurred_at DESC);

-- Keep JSON metadata deliberately narrow. Product IDs live in target_ids;
-- only duplicate provenance/new slug and category destination are accepted.
CREATE OR REPLACE FUNCTION public.admin_activity_metadata_is_valid(
  p_action text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.jsonb_typeof(p_metadata) <> 'object'
     OR pg_catalog.pg_column_size(p_metadata) > 2048 THEN
    RETURN FALSE;
  END IF;

  IF p_action = 'product.duplicate' THEN
    RETURN p_metadata ? 'source_product_id'
      AND p_metadata ? 'new_slug'
      AND (p_metadata - 'source_product_id' - 'new_slug') = '{}'::jsonb
      AND pg_catalog.jsonb_typeof(p_metadata -> 'source_product_id') = 'string'
      AND pg_catalog.jsonb_typeof(p_metadata -> 'new_slug') = 'string'
      AND pg_catalog.length(p_metadata ->> 'source_product_id') = 36
      AND pg_catalog.length(p_metadata ->> 'new_slug') BETWEEN 1 AND 500;
  END IF;

  IF p_action = 'product.category_change' THEN
    RETURN p_metadata ? 'category_id'
      AND (p_metadata - 'category_id') = '{}'::jsonb
      AND pg_catalog.jsonb_typeof(p_metadata -> 'category_id') = 'string'
      AND pg_catalog.length(p_metadata ->> 'category_id') = 36;
  END IF;

  RETURN p_metadata = '{}'::jsonb;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.admin_activity'::regclass
      AND conname = 'admin_activity_metadata_allowlist'
  ) THEN
    ALTER TABLE public.admin_activity
      ADD CONSTRAINT admin_activity_metadata_allowlist
      CHECK (public.admin_activity_metadata_is_valid(action, metadata));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.stamp_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_actor uuid := auth.uid();
BEGIN
  IF authenticated_actor IS NULL
     OR NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Admin access required';
  END IF;

  NEW.actor_id := authenticated_actor;
  NEW.occurred_at := pg_catalog.transaction_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_admin_activity_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '42501',
    MESSAGE = 'Admin activity is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_activity_stamp_insert
  ON public.admin_activity;
CREATE TRIGGER admin_activity_stamp_insert
  BEFORE INSERT ON public.admin_activity
  FOR EACH ROW EXECUTE FUNCTION public.stamp_admin_activity();

DROP TRIGGER IF EXISTS admin_activity_prevent_changes
  ON public.admin_activity;
CREATE TRIGGER admin_activity_prevent_changes
  BEFORE UPDATE OR DELETE ON public.admin_activity
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_activity_changes();

ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_activity_admin_read"
  ON public.admin_activity;
CREATE POLICY "admin_activity_admin_read"
  ON public.admin_activity
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Default Supabase grants can otherwise make a newly created public-schema
-- table writable. Authenticated users receive read-only access, further gated
-- by RLS; operation RPCs below are the only application write path.
REVOKE ALL ON TABLE public.admin_activity
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.admin_activity TO authenticated;
REVOKE ALL ON SEQUENCE public.admin_activity_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_activity_metadata_is_valid(text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.stamp_admin_activity()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_admin_activity_changes()
  FROM PUBLIC, anon, authenticated, service_role;

-- Apply one state/category operation to a complete, validated product set.
-- SECURITY DEFINER is intentional: authenticated users cannot forge activity
-- INSERTs directly, so the operation and its log entry must execute together
-- behind this explicit admin check. All object names are schema-qualified.
CREATE OR REPLACE FUNCTION public.admin_manage_products(
  p_product_ids uuid[],
  p_operation text,
  p_category_id uuid DEFAULT NULL
)
RETURNS TABLE (product_id uuid, product_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_actor uuid := auth.uid();
  supplied_count integer;
  distinct_count integer;
  target_count integer;
  updated_count integer;
  featured_count integer;
  compacted_count integer;
  next_featured_order integer;
  stage_offset integer;
  activity_action text;
  activity_metadata jsonb := '{}'::jsonb;
BEGIN
  IF authenticated_actor IS NULL
     OR NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Admin access required';
  END IF;

  IF p_product_ids IS NULL
     OR cardinality(p_product_ids) = 0
     OR cardinality(p_product_ids) > 500 THEN
    RAISE EXCEPTION 'Select between 1 and 500 products';
  END IF;

  IF p_operation IS NULL OR p_operation NOT IN (
    'archive',
    'activate',
    'deactivate',
    'feature',
    'unfeature',
    'category_change'
  ) THEN
    RAISE EXCEPTION 'Unsupported product operation';
  END IF;

  SELECT count(*)::integer, count(DISTINCT supplied.id)::integer
  INTO supplied_count, distinct_count
  FROM unnest(p_product_ids) AS supplied(id);

  IF supplied_count <> distinct_count THEN
    RAISE EXCEPTION 'Products must be unique and non-null';
  END IF;

  -- All operations take these locks in the same order. This serializes category
  -- reassignment against category deletion and feature transitions against the
  -- collision-safe ordering RPCs installed by migration 008.
  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);
  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 2);

  IF p_operation = 'category_change' THEN
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'A destination category is required';
    END IF;

    PERFORM category.id
    FROM public.categories AS category
    WHERE category.id = p_category_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0002',
        MESSAGE = 'Category not found';
    END IF;
  ELSIF p_category_id IS NOT NULL THEN
    RAISE EXCEPTION 'Category is only valid for category changes';
  END IF;

  PERFORM product.id
  FROM public.products AS product
  WHERE product.featured IS TRUE
     OR product.id = ANY(p_product_ids)
  ORDER BY product.id ASC
  FOR UPDATE;

  SELECT count(*)::integer
  INTO target_count
  FROM public.products AS product
  WHERE product.id = ANY(p_product_ids);

  IF target_count <> supplied_count THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Every selected product must exist';
  END IF;

  CASE p_operation
    WHEN 'archive' THEN
      UPDATE public.products AS product
      SET active = FALSE,
          featured = FALSE,
          featured_order = 0
      WHERE product.id = ANY(p_product_ids);
      GET DIAGNOSTICS updated_count = ROW_COUNT;

    WHEN 'activate' THEN
      UPDATE public.products AS product
      SET active = TRUE
      WHERE product.id = ANY(p_product_ids);
      GET DIAGNOSTICS updated_count = ROW_COUNT;

    WHEN 'deactivate' THEN
      UPDATE public.products AS product
      SET active = FALSE,
          featured = FALSE,
          featured_order = 0
      WHERE product.id = ANY(p_product_ids);
      GET DIAGNOSTICS updated_count = ROW_COUNT;

    WHEN 'feature' THEN
      IF EXISTS (
        SELECT 1
        FROM public.products AS product
        WHERE product.id = ANY(p_product_ids)
          AND product.active IS NOT TRUE
      ) THEN
        RAISE EXCEPTION 'Only active products can be featured';
      END IF;

      SELECT COALESCE(max(product.featured_order), -1) + 1
      INTO next_featured_order
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
      SET featured = TRUE,
          featured_order = next_featured_order + additions.append_offset
      FROM additions
      WHERE product.id = additions.id;

      updated_count := target_count;

    WHEN 'unfeature' THEN
      UPDATE public.products AS product
      SET featured = FALSE,
          featured_order = 0
      WHERE product.id = ANY(p_product_ids);
      GET DIAGNOSTICS updated_count = ROW_COUNT;

    WHEN 'category_change' THEN
      UPDATE public.products AS product
      SET category_id = p_category_id
      WHERE product.id = ANY(p_product_ids);
      GET DIAGNOSTICS updated_count = ROW_COUNT;
  END CASE;

  IF updated_count <> target_count THEN
    RAISE EXCEPTION 'Product operation was incomplete';
  END IF;

  -- Membership-removing operations compact in the same transaction. Feature
  -- additions compact too, repairing any historical gaps without changing the
  -- relative editorial order.
  IF p_operation IN ('archive', 'deactivate', 'feature', 'unfeature') THEN
    SELECT count(*)::integer,
           COALESCE(max(product.featured_order), -1)
             + count(*)::integer + 1
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

      GET DIAGNOSTICS compacted_count = ROW_COUNT;
      IF compacted_count <> featured_count THEN
        RAISE EXCEPTION 'Featured product compaction was incomplete';
      END IF;
    END IF;
  END IF;

  activity_action := 'product.' || p_operation;
  IF p_operation = 'category_change' THEN
    activity_metadata := pg_catalog.jsonb_build_object(
      'category_id', p_category_id::text
    );
  END IF;

  INSERT INTO public.admin_activity (
    actor_id,
    action,
    target_ids,
    metadata
  ) VALUES (
    authenticated_actor,
    activity_action,
    p_product_ids,
    activity_metadata
  );

  RETURN QUERY
  SELECT product.id, product.slug
  FROM unnest(p_product_ids) WITH ORDINALITY AS supplied(id, position)
  JOIN public.products AS product ON product.id = supplied.id
  ORDER BY supplied.position;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manage_products(uuid[], text, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_products(uuid[], text, uuid)
  TO authenticated;

-- Apply category, active, and featured fields from the ordinary product editor
-- under the same lock order as bulk operations. Nested operation calls share
-- this transaction, so all state transitions and their activity entries commit
-- or roll back together. Descriptive/price/media fields remain a separate
-- ordinary admin update and are intentionally outside the operational log.
CREATE OR REPLACE FUNCTION public.admin_set_product_editor_state(
  p_product_id uuid,
  p_category_id uuid,
  p_active boolean,
  p_featured boolean
)
RETURNS TABLE (product_id uuid, product_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_actor uuid := auth.uid();
  current_category_id uuid;
  current_active boolean;
  current_featured boolean;
BEGIN
  IF authenticated_actor IS NULL
     OR NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Admin access required';
  END IF;
  IF p_category_id IS NULL OR p_active IS NULL OR p_featured IS NULL THEN
    RAISE EXCEPTION 'Product editor state is incomplete';
  END IF;
  IF p_featured AND NOT p_active THEN
    RAISE EXCEPTION 'A featured product must be active';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);
  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 2);

  SELECT product.category_id, product.active, product.featured
  INTO current_category_id, current_active, current_featured
  FROM public.products AS product
  WHERE product.id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Product not found';
  END IF;

  IF current_category_id IS DISTINCT FROM p_category_id THEN
    PERFORM operation.product_id
    FROM public.admin_manage_products(
      ARRAY[p_product_id],
      'category_change',
      p_category_id
    ) AS operation;
    current_category_id := p_category_id;
  END IF;

  IF current_active IS DISTINCT FROM p_active THEN
    PERFORM operation.product_id
    FROM public.admin_manage_products(
      ARRAY[p_product_id],
      CASE WHEN p_active THEN 'activate' ELSE 'deactivate' END,
      NULL
    ) AS operation;
    current_active := p_active;
    IF NOT p_active THEN
      current_featured := FALSE;
    END IF;
  END IF;

  IF current_featured IS DISTINCT FROM p_featured THEN
    PERFORM operation.product_id
    FROM public.admin_manage_products(
      ARRAY[p_product_id],
      CASE WHEN p_featured THEN 'feature' ELSE 'unfeature' END,
      NULL
    ) AS operation;
  END IF;

  RETURN QUERY
  SELECT product.id, product.slug
  FROM public.products AS product
  WHERE product.id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_product_editor_state(
  uuid, uuid, boolean, boolean
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_product_editor_state(
  uuid, uuid, boolean, boolean
) TO authenticated;

-- Allocate a copy suffix while a database lock is held. A uniqueness retry
-- also protects against legacy/direct writers that do not take this lock.
-- Copies are drafts: no stock, media, SEO text, active state, or featured state
-- is inherited from the source product.
CREATE OR REPLACE FUNCTION public.admin_duplicate_product(p_product_id uuid)
RETURNS TABLE (product_id uuid, product_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_actor uuid := auth.uid();
  source_product public.products%ROWTYPE;
  base_slug text;
  candidate_slug text;
  created_id uuid;
  suffix_number integer;
BEGIN
  IF authenticated_actor IS NULL
     OR NOT COALESCE(public.is_admin(), FALSE) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Admin access required';
  END IF;

  -- Serialize category/FK writers before taking a product row lock. This is
  -- the same outer lock order used by bulk changes, category deletion, and
  -- the product editor, preventing category↔product lock inversion.
  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 1);
  PERFORM pg_catalog.pg_advisory_xact_lock(741955101, 3);

  SELECT product.*
  INTO source_product
  FROM public.products AS product
  WHERE product.id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Product not found';
  END IF;

  base_slug := pg_catalog.regexp_replace(
    source_product.slug,
    '-copy(-[0-9]+)?$',
    ''
  );
  IF base_slug = '' THEN
    base_slug := source_product.slug;
  END IF;

  FOR suffix_number IN 1..10000 LOOP
    candidate_slug := base_slug || '-copy'
      || CASE
           WHEN suffix_number = 1 THEN ''
           ELSE '-' || suffix_number::text
         END;

    BEGIN
      INSERT INTO public.products (
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
        featured,
        active,
        featured_order,
        country_of_origin,
        hsn_code,
        meta_title,
        meta_description
      ) VALUES (
        candidate_slug,
        source_product.name || ' (Copy)',
        source_product.category_id,
        source_product.price,
        source_product.compare_at_price,
        source_product.description,
        source_product.details,
        source_product.material,
        source_product.color,
        source_product.pattern,
        source_product.tags,
        '{}'::text[],
        0,
        FALSE,
        FALSE,
        0,
        source_product.country_of_origin,
        source_product.hsn_code,
        '',
        ''
      )
      RETURNING id INTO created_id;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        created_id := NULL;
    END;
  END LOOP;

  IF created_id IS NULL THEN
    RAISE EXCEPTION 'Could not allocate a unique copy slug';
  END IF;

  INSERT INTO public.admin_activity (
    actor_id,
    action,
    target_ids,
    metadata
  ) VALUES (
    authenticated_actor,
    'product.duplicate',
    ARRAY[created_id],
    pg_catalog.jsonb_build_object(
      'source_product_id', source_product.id::text,
      'new_slug', candidate_slug
    )
  );

  RETURN QUERY SELECT created_id, candidate_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_duplicate_product(uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_duplicate_product(uuid)
  TO authenticated;

-- Preserve migration 008's public RPC contract while routing every existing
-- feature/unfeature caller through the new atomic, activity-logging operation.
CREATE OR REPLACE FUNCTION public.set_products_featured(
  p_product_ids uuid[],
  p_featured boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_featured IS NULL THEN
    RAISE EXCEPTION 'Featured state is required';
  END IF;

  PERFORM operation.product_id
  FROM public.admin_manage_products(
    p_product_ids,
    CASE WHEN p_featured THEN 'feature' ELSE 'unfeature' END,
    NULL
  ) AS operation;
END;
$$;

REVOKE ALL ON FUNCTION public.set_products_featured(uuid[], boolean)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_products_featured(uuid[], boolean)
  TO authenticated;

COMMIT;
