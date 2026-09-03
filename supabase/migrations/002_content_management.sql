-- ═══════════════════════════════════════════════════════════════════
-- Content Management System Extensions
-- Categories, Featured Products, Site Banners
-- ═══════════════════════════════════════════════════════════════════

-- ── Enhance Categories ───────────────────────────────────────────────
-- Add image and home page display control
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS display_on_home boolean DEFAULT true;

-- ── Featured Products Ordering ───────────────────────────────────────
-- Control display order of featured products on home page
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS featured_order int DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_featured_order_idx
  ON public.products(featured_order)
  WHERE featured = true;

-- ── Site Banners Table ───────────────────────────────────────────────
-- Hero images, category headers, promotional banners
CREATE TABLE IF NOT EXISTS public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL CHECK (location IN ('home-hero', 'category-header', 'promo-bar')),
  title text DEFAULT '',
  subtitle text DEFAULT '',
  cta_text text DEFAULT '',
  cta_link text DEFAULT '',
  image_url text NOT NULL,
  mobile_image_url text,
  enabled boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── RLS for Banners ──────────────────────────────────────────────────
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;

-- Public can view enabled banners
CREATE POLICY "banners_public_read" ON public.site_banners
  FOR SELECT USING (enabled = true);

-- Admins can manage all banners
CREATE POLICY "banners_admin_write" ON public.site_banners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
