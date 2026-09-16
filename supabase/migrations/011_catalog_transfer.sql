-- Catalog-only recovery from the last successful live build.
-- Contains 6 categories and 12 products; no users, profiles, addresses,
-- wishlists, reviews, orders, order items, requests, or subscriber data.
-- Original image storage was deleted with the old project, so each product
-- uses deterministic local illustrated placeholders pending new photography.

BEGIN;

INSERT INTO public.categories (
  slug, name, description, sort_order, image_url, display_on_home
) VALUES (
  'ties', 'Ties', 'Handsome silk and woven neckties — formal solids, regimental stripes and textured weaves.', 1, NULL, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url,
  display_on_home = EXCLUDED.display_on_home;

INSERT INTO public.categories (
  slug, name, description, sort_order, image_url, display_on_home
) VALUES (
  'cufflinks', 'Cufflinks', 'Precision-cast cufflinks in gold, silver and gunmetal finishes, set with stone and enamel.', 2, NULL, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url,
  display_on_home = EXCLUDED.display_on_home;

INSERT INTO public.categories (
  slug, name, description, sort_order, image_url, display_on_home
) VALUES (
  'brooches', 'Brooches', 'Statement sherwani brooches and minimal lapel pins for weddings and festive occasions.', 3, NULL, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url,
  display_on_home = EXCLUDED.display_on_home;

INSERT INTO public.categories (
  slug, name, description, sort_order, image_url, display_on_home
) VALUES (
  'pocket-squares', 'Pocket Squares', 'Hand-rolled silk squares in solids, prints and contrast borders — the quiet flourish.', 4, NULL, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url,
  display_on_home = EXCLUDED.display_on_home;

INSERT INTO public.categories (
  slug, name, description, sort_order, image_url, display_on_home
) VALUES (
  'buttons', 'Buttons', 'Premium blazer, suit and kurta button sets in brass, horn and mother-of-pearl.', 5, NULL, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url,
  display_on_home = EXCLUDED.display_on_home;

INSERT INTO public.categories (
  slug, name, description, sort_order, image_url, display_on_home
) VALUES (
  'gift-sets', 'Gift Sets', 'Coordinated tie, square and cufflink sets in signature gift boxes — ready to give.', 6, NULL, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  image_url = EXCLUDED.image_url,
  display_on_home = EXCLUDED.display_on_home;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'contemporary-jacquard-silk-tie-muted-teal-mint-geometric-stripe',
  'Contemporary Jacquard Silk Tie – Muted Teal & Mint Geometric Stripe',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A refined balance of modern color-blocking and classical heritage detailing. Crafted with a premium textured weave, this necktie combines rich teal, muted sage, and delicate mint accents in a diagonal panel design. The center showcase features an intricately woven damask-paisley motif, framed by micro-textured geometric weaves at the tip and collar. Designed to deliver clean structure and a full knot, it transitions effortlessly from high-stakes boardrooms to formal evening gatherings.

Key Features

Intricate Multi-Texture Weave: Features a tactile blend of jacquard-woven baroque paisley, fine diagonal striping, and micro-honeycomb textured tips.

Balanced Palette: Cool tones of petrol blue, sage green, icy mint, and silver-grey suit both light and dark suiting fabrics.

Substantial Drape & Hand-Feel: Structured inner lining ensures easy tying, a defined dimple, and wrinkle resistance throughout long wear.

Versatile Formality: Sharp enough for executive corporate wear, distinct enough for weddings and black-tie-optional events.',
  '["Intricate Multi-Texture Weave: Features a tactile blend of jacquard-woven baroque paisley, fine diagonal striping, and micro-honeycomb textured tips.","Balanced Palette: Cool tones of petrol blue, sage green, icy mint, and silver-grey suit both light and dark suiting fabrics.","Substantial Drape & Hand-Feel: Structured inner lining ensures easy tying, a defined dimple, and wrinkle resistance throughout long wear.","Versatile Formality: Sharp enough for executive corporate wear, distinct enough for weddings and black-tie-optional events."]'::jsonb,
  '100% jacquard woven silk',
  'teal & mint geometric stripe',
  'striped',
  ARRAY[]::text[],
  ARRAY['/products/contemporary-jacquard-silk-tie-muted-teal-mint-geometric-stripe.svg', '/products/contemporary-jacquard-silk-tie-muted-teal-mint-geometric-stripe-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:31:48.255392+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'baroque-crimson-onyx-jacquard-silk-tie-ombr-panel-edition',
  'Baroque Crimson & Onyx Jacquard Silk Tie – Ombré Panel Edition',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A commanding statement piece rooted in rich, dramatic tones. Woven in a sophisticated palette of deep wine, crimson red, and shadow black, this tie features flowing baroque paisley motifs juxtaposed against structured textural blocking. The design shifts effortlessly from an understated, subtly heathered upper knot panel into an opulent, swirling scroll pattern, finishing with a fine-ribbed jacquard tip. Crafted for depth, tactile appeal, and a confident knot profile, it is an essential accent for gala evenings, formal celebrations, and bold business tailoring.',
  '["Two-Tone Dimensional Jacquard: High-density weave interlaces lustrous crimson threads with deep black yarn to produce rich depth and a subtle, light-catching sheen.","Tonal Panel Architecture: Balanced combination of subtle fine-grain top section, ornate central scrollwork, and textured tip structure.","Firm Knot & Dimple Retention: Reinforced interlining provides substantial weight, resisting collapse while holding a crisp, all-day dimple.","Evening & Power Dressing Ready: Adds warmth and prestige to evening wear, black-tie optional attire, and boardroom suits."]'::jsonb,
  '-',
  '-',
  'textured',
  ARRAY[]::text[],
  ARRAY['/products/baroque-crimson-onyx-jacquard-silk-tie-ombr-panel-edition.svg', '/products/baroque-crimson-onyx-jacquard-silk-tie-ombr-panel-edition-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:35:07.707596+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'modern-baroque-silk-tie-royal-blue-silver-ice-stripe-edition',
  'Modern Baroque Silk Tie – Royal Blue, Silver & Ice Stripe Edition',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A commanding marriage of traditional craftsmanship and athletic, sharp geometry. This necktie features layered baroque floral-paisley motifs woven over a clean backdrop of diagonal racing twill stripes. Rendered in a vibrant palette of sapphire blue, cerulean, sterling silver, and deep navy borders, it offers both textural contrast and refined visual depth. Its substantial construction ties a crisp, sculptural knot, making it a natural standout for executive meetings, weddings, and formal seasonal celebrations.',
  '["Layered Dimensional Jacquard: Ornate silver-and-blue floral filigree floats effortlessly across multi-tonal diagonal stripes for a three-dimensional effect.","Vibrant Cool Palette: Striking combination of cornflower blue, royal sapphire, bright silver, and navy coordinates seamlessly with core menswear tones.","Sculptural Knot & Dimple: High-density jacquard weaving paired with a structured interior canvas delivers full, knot-holding stability that resists sagging.","Sharp Versatility: Balanced proportion between contemporary striping and timeless scrollwork suitable for upscale daytime business and evening banquets."]'::jsonb,
  '-',
  '-',
  'striped',
  ARRAY[]::text[],
  ARRAY['/products/modern-baroque-silk-tie-royal-blue-silver-ice-stripe-edition.svg', '/products/modern-baroque-silk-tie-royal-blue-silver-ice-stripe-edition-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:37:30.537483+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'asymmetrical-embroidered-effect-paisley-tie-rich-wine-icy-grey',
  'asymmetrical Embroidered-Effect Paisley Tie – Rich Wine & Icy Grey',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'An artful composition combining quiet minimalism with ornate oriental floral filigree. Set against a fine-grain, structured maroon canvas, this necktie features silver-grey lotus blossoms and flowing baroque scrollwork cascading down the collar and framing the lower blade. Delicate micro-paisley motifs scatter across the solid wine body, creating an elegant visual rhythm without overwhelming the silhouette. Designed for discerning dressers who appreciate nuanced details, this tie brings quiet luxury to evening galas, autumn weddings, and sharp bespoke tailoring.',
  '["Asymmetrical Placement Weave: Dense silver-grey lotus embroidery-effect jacquard gracefully borders the edges, transitioning into an airy field of floating micro-motifs.","Fine-Piqué Textured Ground: Woven with a subtle matte texture that provides rich tactile grip, preventing slipping and ensuring knot longevity.","Refined Contrast: Crisp ice-silver threads lift cleanly off the deep wine-maroon ground, delivering high-contrast sophistication in any lighting.","Structured Interior Drape: Substantial inner canvas lining allows for a sharp dimple and maintains an uncreased, elegant profile throughout the day."]'::jsonb,
  '-',
  '-',
  'striped',
  ARRAY[]::text[],
  ARRAY['/products/asymmetrical-embroidered-effect-paisley-tie-rich-wine-icy-grey.svg', '/products/asymmetrical-embroidered-effect-paisley-tie-rich-wine-icy-grey-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:39:57.921211+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'architectural-herringbone-micro-grid-jacquard-tie-monochrome-graphite',
  'Architectural Herringbone Micro-Grid Jacquard Tie – Monochrome Graphite',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A masterclass in modern architectural minimalism. Engineered with a subtle parquet micro-brick weave, this tie catches light through texture rather than ostentatious print. Alternating directional grids form a subdued herringbone chevron across deep charcoal and jet-black threads, creating quiet tactile depth from across the table. It knots with dense, structured precision and lays flat without shifting, making it an indispensable power piece for high-level boardroom meetings, executive evening dinners, and sleek minimalist suiting.',
  '["Architectural Micro-Grid Weave: Tight, geometric jacquard structure shifts in sheen as you move, giving a dynamic feel to an understated monochrome palette.","Textured Non-Slip Knotting: Fine-relief gridded surface locks into place cleanly, ensuring a sharp four-in-hand or half-Windsor knot that will not slip loose.","Universal Versatility: The classic graphite-on-black tone coordinates effortlessly with any suit color or pattern without clashing.","Crisp Dimple Retention: Reinforced wool-blend canvas interior provides the exact density needed to hold a deep, clean dimple all day."]'::jsonb,
  '-',
  '-',
  'textured',
  ARRAY[]::text[],
  ARRAY['/products/architectural-herringbone-micro-grid-jacquard-tie-monochrome-graphite.svg', '/products/architectural-herringbone-micro-grid-jacquard-tie-monochrome-graphite-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:42:58.117433+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'contemporary-fragmented-block-tie-muted-burgundy-charcoal',
  'Contemporary Fragmented Block Tie – Muted Burgundy & Charcoal',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A bold, modern interpretation of architectural suiting. Featuring overlapping faceted geometric planes, this necktie combines rich shades of garnet red, deep plum, and shadow charcoal in a dynamic shard pattern. The fabric is finished in a high-density, fine-stipple knit-weave texture that gives the bold geometric lines a soft, matte diffusion under direct light. Designed for leaders who want to project authority with a modern edge, it delivers a sharp, clean silhouette suitable for executive meetings, creative industry presentations, and evening events.',
  '["Dynamic Faceted Geometry: Angular overlapping planes break traditional vertical stripes with an asymmetrical, contemporary design.","Granular Diffused Weave: Fine-textured, stipple-woven surface tempers high-contrast colors into an understated matte finish.","Firm Knot & Structure: High-rebound interior wool canvas core keeps the knot well-proportioned and holds a sharp central dimple throughout the day.","Subtle Tone Transitions: Shifts effortlessly across dark plum, garnet, and slate charcoal to anchor tailored outfits without visual clutter."]'::jsonb,
  '-',
  '-',
  'textured',
  ARRAY[]::text[],
  ARRAY['/products/contemporary-fragmented-block-tie-muted-burgundy-charcoal.svg', '/products/contemporary-fragmented-block-tie-muted-burgundy-charcoal-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:45:15.530688+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'monochrome-paisley-jacquard-tie-slate-grey-matte-black-panel-edition',
  'Monochrome Paisley Jacquard Tie – Slate Grey & Matte Black Panel Edition',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'An understated study in monochrome depth and formal power. Designed for those who prefer subtle, tactile richness over loud color, this necktie combines flowing baroque paisley filigree with a textured basketweave ground. The body cascades from high-density, swirling jacquard scrollwork into a clean, solid matte-black tip panel. Woven in tonal shades of graphite, charcoal, and deep jet black, it catches light dynamically as you move while maintaining a commanding, boardroom-ready presence.',
  '["Tonal High-Definition Jacquard: Intricately raised paisley scrollwork woven in multi-dimensional slate and charcoal threads creates tactile depth without clashing colors.","Textured Matte Ground: Fine basketweave ground provides tactile grip, ensuring the knot holds firm without shifting or loosening during wear.","Architectural Panel Tip: Transitions cleanly into a solid black apron tip, grounding the ornate motif and accentuating tailored jacket lines.","Resilient Shape & Knot Memory: Balanced wool-blend interlining supports a full, symmetrical knot (Four-in-Hand or Half-Windsor) and maintains a sharp dimple."]'::jsonb,
  '-',
  '-',
  'textured',
  ARRAY[]::text[],
  ARRAY['/products/monochrome-paisley-jacquard-tie-slate-grey-matte-black-panel-edition.svg', '/products/monochrome-paisley-jacquard-tie-slate-grey-matte-black-panel-edition-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:47:46.388207+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'modern-panel-silk-tie-ruby-red-damask-with-diagonal-accent-stripe',
  'Modern Panel Silk Tie – Ruby Red Damask with Diagonal Accent Stripe',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A commanding composition of ceremonial richness and sharp modern color-blocking. Featuring an elaborate central medallion and damask-paisley panel woven in lustrous crimson threads, this necktie is grounded by a deep wine micro-textured apron and accented with a striking diagonal racing stripe in scarlet red and crisp silver. Crafted for presence and architectural polish, it provides the perfect focal point beneath a tailored lapel—ideal for black-tie galas, high-stakes presentations, festive celebrations, and wedding parties.',
  '["Multi-Textured Jacquard Architecture: Features a detailed central damask medallion flanked by fine diagonal piqué striping, a vibrant scarlet bar, and a dense, micro-textured tip.","Harmonious Red Spectrum: Seamlessly blends deep plum wine, rich ruby, vivid scarlet, and clean silver-white piping for a balanced, luxurious look.","Firm Knot & Dimple Memory: Balanced inner canvas core ensures a clean, substantial knot (Half-Windsor or Four-in-Hand) that stays anchored throughout the day.","Power Suiting Accent: Adds immediate warmth, confidence, and visual depth to three-piece suits, tuxedos, and executive blazers."]'::jsonb,
  '-',
  '-',
  'striped',
  ARRAY[]::text[],
  ARRAY['/products/modern-panel-silk-tie-ruby-red-damask-with-diagonal-accent-stripe.svg', '/products/modern-panel-silk-tie-ruby-red-damask-with-diagonal-accent-stripe-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:51:49.989238+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'architectural-floral-silk-tie-shaded-slate-silver-parquet-weave',
  'Architectural Floral Silk Tie – Shaded Slate & Silver Parquet Weave',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A fusion of organic nature and geometric architecture. Set against a dramatic parquet cross-hatch ground, this necktie transitions from rich charcoal into an illustrative spray of silver lily blossoms and botanical foliage. The lower blade features directional cross-hatched squares woven with lustrous metallic-sheen threads that catch ambient light from every angle. Designed for those seeking a monochrome accent that is anything but ordinary, it delivers an artistic, polished edge suitable for black-tie optional events, creative black-tie gatherings, weddings, and sleek evening dinners.',
  '["Dual Motif Fusion: Seamlessly blends hand-drawn botanical lily blooms with a textured, architectural parquet check pattern.","Lustrous Monochrome Contrast: High-density weave contrasts deep carbon graphite with bright, light-reflective silver and slate yarn.","Structured Knot Retention: High-rebound inner lining supports a sharp knot and clean center dimple that resists shifting or collapsing during wear.","Versatile Modern Formality: Bridges formal evening elegance and sharp executive styling without introducing conflicting color."]'::jsonb,
  '-',
  '-',
  'printed',
  ARRAY[]::text[],
  ARRAY['/products/architectural-floral-silk-tie-shaded-slate-silver-parquet-weave.svg', '/products/architectural-floral-silk-tie-shaded-slate-silver-parquet-weave-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:55:39.234574+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'tailored-baroque-paisley-tie-rich-burgundy-with-dual-tone-textured-panels',
  'Tailored Baroque Paisley Tie – Rich Burgundy with Dual-Tone Textured Panels',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'An expression of timeless authority and refined craftsmanship. Featuring a high-contrast palette of claret wine, deep oxblood, and ink black, this tie showcases bold baroque paisley scrollwork woven in raised relief. The layout transitions seamlessly from a sleek, understated solid knot through an ombre-textured mid-blade into swirling ornamental botanicals, grounded by a subtle geometric-ribbed tip. Balanced to create a full, sculpted knot profile, it is an essential power accessory designed for executive boardrooms, keynote addresses, and high-formality evening events.',
  '["Dimensional Jacquard Relief: Alternating crimson and black threads produce raised, light-catching paisley motifs that reveal nuanced depth as you move.","Architectural Panel Transition: Shifts deliberately from a smooth, minimalist neckband and knot area into ornate decorative scrolls and a textured apron tip.","Resilient Knot Memory: Reinforced inner canvas interlining provides body and structure, holding a sharp, symmetrical knot and clean center dimple all day.","Universal Suiting Harmony: Deep wine and oxblood undertones bridge cool charcoals and deep navies with warmth and presence."]'::jsonb,
  '-',
  '-',
  'solid',
  ARRAY[]::text[],
  ARRAY['/products/tailored-baroque-paisley-tie-rich-burgundy-with-dual-tone-textured-panels.svg', '/products/tailored-baroque-paisley-tie-rich-burgundy-with-dual-tone-textured-panels-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T10:58:09.019426+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'contemporary-panel-jacquard-tie-seafoam-ice-mint-steel-blue',
  'Contemporary Panel Jacquard Tie – Seafoam, Ice Mint & Steel Blue',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A serene, modern study in tone and texture. Masterfully constructed with diagonal architectural blocking, this tie blends cool tones of dusty seafoam, sage green, icy mint, and slate blue. Across the blade, intricate heritage damask and swirling baroque paisley bands sit adjacent to tactile micro-checks and clean satin twill stripes. Designed to deliver a fresh, luminous accent to formal wear, it adds understated sophistication to summer weddings, executive daytime meetings, and sharp three-piece tailoring.',
  '["Multi-Texture Diagonal Architecture: Features five distinct woven textures—from raised baroque jacquard and silver lace-effect filigree to micro-waffle checks and lustrous satin twill.","Cool, Calming Palette: Tonal transitions across slate blue, celadon, sage green, and icy silver bring brightness without loud saturation.","Sculpted Dimple & Knot Memory: Balanced inner lining provides substantial drape and holds a firm, elegant knot that will not slip throughout the day.","High-Versatility Modern Fit: Sharp enough to pair with classic corporate suiting, yet airy and refined for outdoor galas and weddings."]'::jsonb,
  '-',
  '-',
  'textured',
  ARRAY[]::text[],
  ARRAY['/products/contemporary-panel-jacquard-tie-seafoam-ice-mint-steel-blue.svg', '/products/contemporary-panel-jacquard-tie-seafoam-ice-mint-steel-blue-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T11:00:44.632679+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

INSERT INTO public.products (
  slug, name, category_id, price, compare_at_price, description, details,
  material, color, pattern, tags, images, stock, featured, featured_order,
  active, created_at, country_of_origin, hsn_code, meta_title, meta_description
) VALUES (
  'asymmetrical-jacquard-paisley-tie-muted-burgundy-silver-lace-edition',
  'Asymmetrical Jacquard Paisley Tie – Muted Burgundy & Silver Lace Edition',
  (SELECT id FROM public.categories WHERE slug = 'ties'),
  99900,
  NULL,
  'A masterclass in delicate contrast and quiet luxury. Grounded in an elegant dusty rose-burgundy base, this necktie combines clean minimalism with ornate oriental artistry. The upper blade remains understated with sparsely floating micro-paisley motifs, while the lower tip blossoms into an intricate cascade of silver lotus flowers and baroque scrolls. Designed with a textured matte ground that catches the light gently, it provides an elevated focal point for formal celebrations, weddings, and high-end three-piece tailoring.',
  '["Placement Lotus Filigree: Raised silver jacquard lotus flowers frame the bottom blade, tapering gracefully into minimalist micro-paisley accents.","Refined Textured Ground: Woven in a tight, non-slip piqué texture that adds tactile depth and ensures the knot stays firmly positioned.","Balanced Soft-Tone Palette: The understated dusty rose / muted claret tone pairs effortlessly with silver threads to flatter a wide range of suiting.","Firm Dimple & Knot Retention: Dense inner interlining supports a clean, sculpted knot with an enduring center dimple that holds all day."]'::jsonb,
  '-',
  '-',
  'textured',
  ARRAY[]::text[],
  ARRAY['/products/asymmetrical-jacquard-paisley-tie-muted-burgundy-silver-lace-edition.svg', '/products/asymmetrical-jacquard-paisley-tie-muted-burgundy-silver-lace-edition-detail.svg']::text[],
  100,
  FALSE,
  0,
  TRUE,
  '2026-09-02T11:02:14.921315+00:00'::timestamptz,
  'India',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  description = EXCLUDED.description,
  details = EXCLUDED.details,
  material = EXCLUDED.material,
  color = EXCLUDED.color,
  pattern = EXCLUDED.pattern,
  tags = EXCLUDED.tags,
  images = EXCLUDED.images,
  stock = EXCLUDED.stock,
  featured = EXCLUDED.featured,
  featured_order = EXCLUDED.featured_order,
  active = EXCLUDED.active,
  country_of_origin = EXCLUDED.country_of_origin,
  hsn_code = EXCLUDED.hsn_code,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description;

UPDATE public.products
SET featured = slug IN ('baroque-crimson-onyx-jacquard-silk-tie-ombr-panel-edition', 'modern-baroque-silk-tie-royal-blue-silver-ice-stripe-edition', 'architectural-herringbone-micro-grid-jacquard-tie-monochrome-graphite', 'contemporary-fragmented-block-tie-muted-burgundy-charcoal', 'monochrome-paisley-jacquard-tie-slate-grey-matte-black-panel-edition', 'modern-panel-silk-tie-ruby-red-damask-with-diagonal-accent-stripe', 'architectural-floral-silk-tie-shaded-slate-silver-parquet-weave', 'tailored-baroque-paisley-tie-rich-burgundy-with-dual-tone-textured-panels', 'contemporary-panel-jacquard-tie-seafoam-ice-mint-steel-blue', 'asymmetrical-jacquard-paisley-tie-muted-burgundy-silver-lace-edition'),
    featured_order = CASE slug
      WHEN 'baroque-crimson-onyx-jacquard-silk-tie-ombr-panel-edition' THEN 0
      WHEN 'modern-baroque-silk-tie-royal-blue-silver-ice-stripe-edition' THEN 1
      WHEN 'architectural-herringbone-micro-grid-jacquard-tie-monochrome-graphite' THEN 2
      WHEN 'contemporary-fragmented-block-tie-muted-burgundy-charcoal' THEN 3
      WHEN 'monochrome-paisley-jacquard-tie-slate-grey-matte-black-panel-edition' THEN 4
      WHEN 'modern-panel-silk-tie-ruby-red-damask-with-diagonal-accent-stripe' THEN 5
      WHEN 'architectural-floral-silk-tie-shaded-slate-silver-parquet-weave' THEN 6
      WHEN 'tailored-baroque-paisley-tie-rich-burgundy-with-dual-tone-textured-panels' THEN 7
      WHEN 'contemporary-panel-jacquard-tie-seafoam-ice-mint-steel-blue' THEN 8
      WHEN 'asymmetrical-jacquard-paisley-tie-muted-burgundy-silver-lace-edition' THEN 9
      ELSE 0
    END
WHERE slug IN ('contemporary-jacquard-silk-tie-muted-teal-mint-geometric-stripe', 'baroque-crimson-onyx-jacquard-silk-tie-ombr-panel-edition', 'modern-baroque-silk-tie-royal-blue-silver-ice-stripe-edition', 'asymmetrical-embroidered-effect-paisley-tie-rich-wine-icy-grey', 'architectural-herringbone-micro-grid-jacquard-tie-monochrome-graphite', 'contemporary-fragmented-block-tie-muted-burgundy-charcoal', 'monochrome-paisley-jacquard-tie-slate-grey-matte-black-panel-edition', 'modern-panel-silk-tie-ruby-red-damask-with-diagonal-accent-stripe', 'architectural-floral-silk-tie-shaded-slate-silver-parquet-weave', 'tailored-baroque-paisley-tie-rich-burgundy-with-dual-tone-textured-panels', 'contemporary-panel-jacquard-tie-seafoam-ice-mint-steel-blue', 'asymmetrical-jacquard-paisley-tie-muted-burgundy-silver-lace-edition');

COMMIT;
