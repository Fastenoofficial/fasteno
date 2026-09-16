-- ═══════════════════════════════════════════════════════════════════
-- Fasteno Shyama — optional sample catalog data
-- Run only AFTER the complete canonical migration chain (currently 001–010).
-- Mirrors lib/seed-data.ts. Idempotent and ordering-safe when re-run.
-- ═══════════════════════════════════════════════════════════════════

-- Preserve an administrator's current category order. Existing seed rows only
-- receive copy updates; any missing seed category appends under a table lock.
DO $seed_categories$
DECLARE
  item record;
  next_order integer;
BEGIN
  LOCK TABLE public.categories IN SHARE ROW EXCLUSIVE MODE;

  FOR item IN
    SELECT *
    FROM (VALUES
      (0, 'ties', 'Ties', 'Handsome silk and woven neckties — formal solids, regimental stripes and textured weaves.'),
      (1, 'cufflinks', 'Cufflinks', 'Precision-cast cufflinks in gold, silver and gunmetal finishes, set with stone and enamel.'),
      (2, 'brooches', 'Brooches', 'Statement sherwani brooches and minimal lapel pins for weddings and festive occasions.'),
      (3, 'pocket-squares', 'Pocket Squares', 'Hand-rolled silk squares in solids, prints and contrast borders — the quiet flourish.'),
      (4, 'buttons', 'Buttons', 'Premium blazer, suit and kurta button sets in brass, horn and mother-of-pearl.'),
      (5, 'gift-sets', 'Gift Sets', 'Coordinated tie, square and cufflink sets in signature gift boxes — ready to give.')
    ) AS seed(seed_order, slug, name, description)
    ORDER BY seed.seed_order
  LOOP
    UPDATE public.categories
    SET name = item.name,
        description = item.description
    WHERE slug = item.slug;

    IF NOT FOUND THEN
      SELECT COALESCE(max(category.sort_order), -1) + 1
      INTO next_order
      FROM public.categories AS category;

      INSERT INTO public.categories (slug, name, description, sort_order)
      VALUES (item.slug, item.name, item.description, next_order);
    END IF;
  END LOOP;
END
$seed_categories$;

CREATE TEMP TABLE IF NOT EXISTS seed_product_featured_state (
  slug text PRIMARY KEY,
  desired_featured boolean NOT NULL,
  seed_order bigint GENERATED ALWAYS AS IDENTITY
);
TRUNCATE pg_temp.seed_product_featured_state RESTART IDENTITY;

-- helper to keep product inserts readable
create or replace function pg_temp.seed_product(
  p_slug text, p_name text, p_cat text, p_price int, p_compare int,
  p_desc text, p_details jsonb, p_material text, p_color text,
  p_pattern text, p_tags text[], p_stock int, p_featured boolean
) returns void language plpgsql as $fn$
begin
  insert into pg_temp.seed_product_featured_state (slug, desired_featured)
  values (p_slug, p_featured)
  on conflict (slug) do update
    set desired_featured = excluded.desired_featured;

  insert into public.products
    (slug, name, category_id, price, compare_at_price, description, details,
     material, color, pattern, tags, images, stock, featured, featured_order, active)
  values
    (p_slug, p_name, (select id from public.categories where slug = p_cat),
     p_price, p_compare, p_desc, p_details, p_material, p_color, p_pattern,
     p_tags,
     array['/products/' || p_slug || '.svg', '/products/' || p_slug || '-detail.svg'],
     p_stock, false, 0, true)
  on conflict (slug) do update set
    name = excluded.name, category_id = excluded.category_id,
    price = excluded.price, compare_at_price = excluded.compare_at_price,
    description = excluded.description, details = excluded.details,
    material = excluded.material, color = excluded.color,
    pattern = excluded.pattern, tags = excluded.tags,
    images = excluded.images, stock = excluded.stock,
    active = true;
end;
$fn$;

-- ── Ties ─────────────────────────────────────────────────────────────
select pg_temp.seed_product('midnight-navy-silk-tie', 'Midnight Navy Silk Tie', 'ties', 189900, 229900,
  'The one tie every wardrobe is built around. Our Midnight Navy is woven from mulberry silk twill with a discreet sheen that reads formal in daylight and festive by evening. Cut to a classic 7.5 cm width with a wool-blend interlining for a firm, dimpled knot.',
  '["100% mulberry silk twill","Width 7.5 cm · Length 148 cm","Wool-blend interlining for knot structure","Hand-finished tipping and slip stitch","Dry clean only"]',
  'silk', 'navy', 'solid', array['office','wedding','bestseller'], 42, true);

select pg_temp.seed_product('charcoal-herringbone-tie', 'Charcoal Herringbone Tie', 'ties', 179900, null,
  'A study in quiet texture. The herringbone weave catches light along its chevrons, giving a plain-looking tie unusual depth up close — the detail people notice in a boardroom without knowing why.',
  '["Silk-wool blend, herringbone weave","Width 7.5 cm · Length 148 cm","Muted matte finish","Hand-finished tipping","Dry clean only"]',
  'silk-wool', 'charcoal', 'textured', array['office','interview'], 35, false);

select pg_temp.seed_product('burgundy-repp-stripe-tie', 'Burgundy Repp Stripe Tie', 'ties', 199900, null,
  'Our take on the classic English regimental: deep burgundy grounds crossed with fine gold stripes on a ribbed repp weave. Sharp with navy, grey and charcoal tailoring alike.',
  '["100% silk, repp (ribbed) weave","Width 7.5 cm · Length 148 cm","Diagonal stripe, London direction","Hand-finished tipping and bar tack","Dry clean only"]',
  'silk', 'burgundy', 'striped', array['office','festive','bestseller'], 38, true);

select pg_temp.seed_product('regimental-navy-gold-stripe-tie', 'Regimental Navy & Gold Stripe Tie', 'ties', 189900, null,
  'Bold, even stripes of midnight navy and antique gold — a club tie with presence. Wear it when the room should remember you.',
  '["100% silk, repp weave","Width 8 cm · Length 148 cm","Balanced block stripe","Wool-blend interlining","Dry clean only"]',
  'silk', 'navy', 'striped', array['office','convocation'], 30, false);

select pg_temp.seed_product('ivory-wedding-jacquard-tie', 'Ivory Wedding Jacquard Tie', 'ties', 249900, 279900,
  'Woven for wedding mornings: an ivory jacquard with a tonal diamond motif that photographs beautifully against bandhgalas and dark suits. Subtle enough for the groom''s party, special enough for the groom.',
  '["Silk jacquard, tonal diamond motif","Width 7.5 cm · Length 148 cm","Pairs with our ivory pocket square","Presented in a signature gift sleeve","Dry clean only"]',
  'silk', 'ivory', 'textured', array['wedding','gift'], 24, true);

select pg_temp.seed_product('forest-green-grenadine-tie', 'Forest Green Grenadine Tie', 'ties', 219900, null,
  'Grenadine''s open, airy weave is the connoisseur''s choice — matte, grippy and quietly luxurious. Deep forest green that flatters tan, olive and grey.',
  '["100% silk, garza fina grenadine weave","Width 7.5 cm · Length 148 cm","Untipped, hand-rolled edges","Knots with a natural, relaxed dimple","Dry clean only"]',
  'silk', 'green', 'textured', array['office','evening'], 22, false);

select pg_temp.seed_product('steel-grey-pin-dot-tie', 'Steel Grey Pin-Dot Tie', 'ties', 169900, null,
  'Fine ivory pin-dots on a steel grey ground — the pattern that behaves like a solid but works harder. The safest brave choice in the drawer.',
  '["100% silk twill, printed pin-dot","Width 7.5 cm · Length 148 cm","Wool-blend interlining","Hand-finished tipping","Dry clean only"]',
  'silk', 'grey', 'printed', array['office','interview'], 40, false);

select pg_temp.seed_product('black-satin-formal-tie', 'Black Satin Formal Tie', 'ties', 159900, null,
  'For tuxedos, black-tie optional and evenings that call for polish. A liquid satin black with just enough body to knot cleanly every time.',
  '["Silk satin, high-lustre finish","Width 7 cm · Length 148 cm","Slim-classic profile","Hand-finished tipping","Dry clean only"]',
  'silk', 'black', 'solid', array['evening','formal'], 33, false);

-- ── Cufflinks ────────────────────────────────────────────────────────
select pg_temp.seed_product('gold-tone-knot-cufflinks', 'Gold-Tone Knot Cufflinks', 'cufflinks', 149900, 179900,
  'A sculpted knot in polished gold tone — the cufflink equivalent of a firm handshake. Solid brass with a whale-back closure that fastens in one motion.',
  '["Premium brass, 18k gold-tone plating","Knot face 16 mm","Whale-back closure","Anti-tarnish e-coating","Signature gift box included"]',
  'brass', 'gold', 'solid', array['office','wedding','gift','bestseller'], 50, true);

select pg_temp.seed_product('onyx-square-cufflinks', 'Onyx Square Cufflinks', 'cufflinks', 189900, null,
  'A slab of jet-black onyx framed in rhodium-plated steel. Severe, architectural and unfailingly formal — made for French cuffs and final interviews.',
  '["Natural black onyx inlay","Rhodium-plated stainless steel frame","Face 15 × 15 mm","Whale-back closure","Signature gift box included"]',
  'steel', 'black', 'solid', array['office','evening','gift'], 28, false);

select pg_temp.seed_product('mother-of-pearl-round-cufflinks', 'Mother-of-Pearl Round Cufflinks', 'cufflinks', 229900, null,
  'Iridescent mother-of-pearl discs that shift from silver to blush as the light moves. Set in gold-tone bezels — heirloom material, modern geometry.',
  '["Natural mother-of-pearl face","Brass bezel, gold-tone plating","Face 16 mm diameter","Whale-back closure","Signature gift box included"]',
  'mother-of-pearl', 'ivory', 'solid', array['wedding','gift'], 20, true);

select pg_temp.seed_product('gunmetal-hexagon-cufflinks', 'Gunmetal Hexagon Cufflinks', 'cufflinks', 139900, null,
  'Brushed gunmetal hexagons with a machined edge — engineering-room aesthetics for the modern office. Pairs especially well with grey and blue shirting.',
  '["Stainless steel, brushed gunmetal finish","Face 16 mm across flats","Whale-back closure","Scratch-resistant coating","Signature gift box included"]',
  'steel', 'grey', 'solid', array['office'], 45, false);

select pg_temp.seed_product('royal-blue-enamel-cufflinks', 'Royal Blue Enamel Cufflinks', 'cufflinks', 159900, null,
  'Deep royal blue enamel poured into a polished silver-tone ring — a controlled shot of colour at the cuff that lifts an otherwise sober suit.',
  '["Hand-filled vitreous enamel","Brass base, silver-tone plating","Face 15 mm diameter","Whale-back closure","Signature gift box included"]',
  'brass', 'blue', 'solid', array['office','festive','gift'], 32, false);

select pg_temp.seed_product('silver-bar-cufflinks', 'Silver Bar Cufflinks', 'cufflinks', 129900, null,
  'A clean, mirror-polished bar. No stone, no motif, no noise — the minimalist''s cufflink, engraved-ready for initials.',
  '["Stainless steel, mirror polish","Bar 20 × 6 mm","Whale-back closure","Suitable for engraving","Signature gift box included"]',
  'steel', 'silver', 'solid', array['office','minimal','gift'], 55, false);

-- ── Brooches ─────────────────────────────────────────────────────────
select pg_temp.seed_product('pearl-drop-sherwani-brooch', 'Pearl Drop Sherwani Brooch', 'brooches', 199900, 239900,
  'The wedding-day essential: a gold-tone crest set with crystals, finishing in a single suspended pearl that moves as you do. Designed to sit on sherwanis, bandhgalas and achkans without pulling the drape.',
  '["Brass base, 18k gold-tone plating","Shell pearl drop, crystal pavé","Length 65 mm including drop","Secure locking pin with safety catch","Signature gift box included"]',
  'brass', 'gold', 'solid', array['wedding','festive','bestseller'], 26, true);

select pg_temp.seed_product('kundan-peacock-brooch', 'Kundan Peacock Brooch', 'brooches', 249900, null,
  'A peacock rendered in kundan-style set stones with an emerald-green enamel tail — heritage craft vocabulary in a piece sized for the modern lapel.',
  '["Kundan-style stone setting","Green and gold enamel work","Height 55 mm","Secure locking pin","Signature gift box included"]',
  'brass', 'green', 'printed', array['wedding','festive'], 18, false);

select pg_temp.seed_product('minimal-gold-leaf-lapel-pin', 'Minimal Gold Leaf Lapel Pin', 'brooches', 99900, null,
  'A single laurel leaf in brushed gold tone. The quietest thing on this site — and the one that gets asked about most.',
  '["Brass, brushed gold-tone finish","Height 40 mm","Stick pin with clutch back","Wear on lapel or collar","Signature gift pouch included"]',
  'brass', 'gold', 'solid', array['office','minimal','gift'], 60, false);

select pg_temp.seed_product('crystal-starburst-brooch', 'Crystal Starburst Brooch', 'brooches', 179900, null,
  'Rays of channel-set crystals bursting from a central stone — reception-night sparkle that stays on the right side of flamboyant.',
  '["Clear crystal pavé, silver-tone base","Diameter 48 mm","Secure locking pin with safety catch","Best on dark sherwanis and tuxedos","Signature gift box included"]',
  'brass', 'silver', 'solid', array['wedding','evening'], 22, false);

select pg_temp.seed_product('ruby-red-stone-brooch', 'Ruby-Red Stone Brooch', 'brooches', 219900, null,
  'A deep ruby-red centre stone in a gold-tone floral mount. Made for maroon-and-gold wedding palettes and festive bandhgalas.',
  '["Ruby-red glass centre stone","Brass mount, gold-tone plating","Diameter 45 mm","Secure locking pin","Signature gift box included"]',
  'brass', 'burgundy', 'solid', array['wedding','festive'], 20, false);

-- ── Pocket Squares ───────────────────────────────────────────────────
select pg_temp.seed_product('ivory-silk-pocket-square', 'Ivory Silk Pocket Square', 'pocket-squares', 89900, null,
  'The white-square rule, upgraded: a warm ivory silk with hand-rolled edges that sits with more ease than crisp cotton. The single most versatile accessory we make.',
  '["100% silk twill","40 × 40 cm","Hand-rolled and hand-stitched edges","Warm ivory, pairs with everything","Dry clean recommended"]',
  'silk', 'ivory', 'solid', array['wedding','office','bestseller'], 48, true);

select pg_temp.seed_product('burgundy-paisley-pocket-square', 'Burgundy Paisley Pocket Square', 'pocket-squares', 99900, null,
  'A dense paisley print in burgundy, gold and ink — fold it flat for restraint or puff it for flourish. Built to be the interesting corner of a sober outfit.',
  '["Silk twill, screen-printed paisley","40 × 40 cm","Hand-rolled edges","Burgundy ground with gold motif","Dry clean recommended"]',
  'silk', 'burgundy', 'printed', array['festive','evening'], 36, false);

select pg_temp.seed_product('navy-polka-pocket-square', 'Navy Polka Pocket Square', 'pocket-squares', 84900, null,
  'Ivory dots on a navy ground — the pocket square that agrees with every tie you own. A one-corner-up fold shows the dots best.',
  '["Silk twill, printed polka dot","40 × 40 cm","Hand-rolled edges","Ivory dot on navy","Dry clean recommended"]',
  'silk', 'navy', 'printed', array['office'], 40, false);

select pg_temp.seed_product('gold-contrast-border-pocket-square', 'Gold Contrast-Border Pocket Square', 'pocket-squares', 94900, null,
  'Charcoal centre, antique-gold border. Folded flat it shows a clean gold line above the pocket — a draughtsman''s accent for dark suits.',
  '["Silk twill, woven contrast border","40 × 40 cm","Hand-rolled edges","Charcoal with antique gold frame","Dry clean recommended"]',
  'silk', 'charcoal', 'solid', array['office','evening'], 30, false);

select pg_temp.seed_product('emerald-printed-pocket-square', 'Emerald Printed Pocket Square', 'pocket-squares', 99900, null,
  'A botanical medallion print in emerald and ivory. The colour that makes grey flannel and camel jackets suddenly look considered.',
  '["Silk twill, medallion print","40 × 40 cm","Hand-rolled edges","Emerald ground, ivory motif","Dry clean recommended"]',
  'silk', 'green', 'printed', array['festive','evening'], 28, false);

-- ── Buttons ──────────────────────────────────────────────────────────
select pg_temp.seed_product('golden-brass-blazer-buttons', 'Golden Brass Blazer Buttons (Set of 8)', 'buttons', 129900, null,
  'Re-button a blazer and it becomes a different garment. Eight solid brass buttons — two front, six cuff — with a laurel crest and antique gold finish.',
  '["Solid brass, antique gold finish","2 × 20 mm front, 6 × 15 mm cuff","Laurel crest engraving","Shank back for easy tailoring","Presented in a signature case"]',
  'brass', 'gold', 'solid', array['office','gift'], 34, false);

select pg_temp.seed_product('antique-silver-kurta-buttons', 'Antique Silver Kurta Buttons (Set of 5)', 'buttons', 119900, 139900,
  'Five chained kurta buttons in an antique silver finish with hand-cut filigree detail — festive tradition, engineered to swap between kurtas in seconds.',
  '["Brass, antique silver plating","Filigree engraving","12 mm faces, linked chain","Fits standard kurta buttonholes","Presented in a signature case"]',
  'brass', 'silver', 'textured', array['festive','wedding','bestseller'], 44, true);

select pg_temp.seed_product('mother-of-pearl-shirt-buttons', 'Mother-of-Pearl Shirt Buttons (Set of 10)', 'buttons', 89900, null,
  'Ten genuine mother-of-pearl buttons to elevate a favourite shirt — the upgrade tailors quietly recommend. Natural iridescence no plastic can imitate.',
  '["Genuine river-shell mother-of-pearl","10 × 11.5 mm, 4-hole","3 mm thickness — satisfying heft","Fits standard shirt plackets","Presented in a signature pouch"]',
  'mother-of-pearl', 'ivory', 'solid', array['office','minimal'], 52, false);

select pg_temp.seed_product('black-horn-suit-buttons', 'Black Horn Suit Buttons (Set of 6)', 'buttons', 99900, null,
  'Six genuine horn buttons in deep espresso-black with natural grain variation — the finishing detail on bespoke suits, available for yours.',
  '["Genuine buffalo horn, polished","2 × 20 mm front, 4 × 15 mm cuff","Natural grain — each set unique","4-hole, tailor-ready","Presented in a signature case"]',
  'horn', 'black', 'solid', array['office','minimal'], 38, false);

-- ── Gift Sets ────────────────────────────────────────────────────────
select pg_temp.seed_product('the-monarch-gift-set', 'The Monarch Gift Set', 'gift-sets', 449900, 519900,
  'Our signature trio: the Midnight Navy Silk Tie, Ivory Silk Pocket Square and Gold-Tone Knot Cufflinks, coordinated and boxed. The default answer to ''what do I gift him?''',
  '["Midnight Navy Silk Tie (silk twill)","Ivory Silk Pocket Square (hand-rolled)","Gold-Tone Knot Cufflinks (brass)","Signature rigid gift box with sleeve","Complimentary gift note at checkout"]',
  'silk', 'navy', 'solid', array['gift','wedding','office','bestseller'], 25, true);

select pg_temp.seed_product('the-heir-wedding-set', 'The Heir Wedding Set', 'gift-sets', 499900, null,
  'Built for the wedding season: the Pearl Drop Sherwani Brooch, Antique Silver Kurta Buttons and Ivory Silk Pocket Square in one ceremony-ready box.',
  '["Pearl Drop Sherwani Brooch","Antique Silver Kurta Buttons (set of 5)","Ivory Silk Pocket Square","Signature rigid gift box with sleeve","Complimentary gift note at checkout"]',
  'brass', 'gold', 'solid', array['gift','wedding','festive'], 18, true);

select pg_temp.seed_product('the-boardroom-set', 'The Boardroom Set', 'gift-sets', 349900, null,
  'Promotion-day armour: the Charcoal Herringbone Tie and Gunmetal Hexagon Cufflinks, matched and boxed for the corner-office trajectory.',
  '["Charcoal Herringbone Tie (silk-wool)","Gunmetal Hexagon Cufflinks (steel)","Signature rigid gift box with sleeve","Complimentary gift note at checkout"]',
  'silk-wool', 'charcoal', 'textured', array['gift','office'], 22, false);
-- Apply the authored featured membership without disturbing the relative order
-- of already-featured products. Newly featured seed rows append in seed order;
-- removed rows are compacted safely around the partial unique index from 008.
DO $seed_featured$
DECLARE
  next_order integer;
  featured_count integer;
  stage_offset integer;
BEGIN
  LOCK TABLE public.products IN SHARE ROW EXCLUSIVE MODE;

  UPDATE public.products AS product
  SET featured = FALSE,
      featured_order = 0
  FROM pg_temp.seed_product_featured_state AS desired
  WHERE product.slug = desired.slug
    AND desired.desired_featured IS FALSE
    AND product.featured IS TRUE;

  SELECT COALESCE(max(product.featured_order), -1) + 1
  INTO next_order
  FROM public.products AS product
  WHERE product.featured IS TRUE;

  WITH additions AS (
    SELECT product.id,
           (row_number() OVER (ORDER BY desired.seed_order) - 1)::integer
             AS append_offset
    FROM pg_temp.seed_product_featured_state AS desired
    JOIN public.products AS product ON product.slug = desired.slug
    WHERE desired.desired_featured IS TRUE
      AND product.featured IS NOT TRUE
  )
  UPDATE public.products AS product
  SET featured_order = next_order + additions.append_offset,
      featured = TRUE
  FROM additions
  WHERE product.id = additions.id;

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

  UPDATE public.products
  SET featured_order = 0
  WHERE featured IS NOT TRUE
    AND featured_order <> 0;
END
$seed_featured$;