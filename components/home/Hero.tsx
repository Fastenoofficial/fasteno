import { unstable_noStore as noStore } from "next/cache";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import {
  type BannerProductCallout,
  type HeroCarouselSlide,
  type SiteBannerRow,
} from "@/lib/banner-types";
import { getProductsByIds } from "@/lib/catalog";
import { isSupabaseConfigured, SITE_TAGLINE } from "@/lib/config";
import {
  normalizeImageSource,
  normalizeOutboundUrl,
} from "@/lib/image-security";
import { createPublicClient } from "@/lib/supabase/server";

const FALLBACK_SLIDE: HeroCarouselSlide = {
  id: "editorial-fallback",
  source: "fallback",
  eyebrow: "Fine formal accessories · Made for India",
  title: SITE_TAGLINE.replace(/\.$/, ""),
  subtitle:
    "Silk ties, sculpted cufflinks, heirloom brooches and pocket squares — curated for weddings, boardrooms and festive evenings. The details that finish a man’s attire.",
  cta: { text: "Shop the Collection", href: "/shop" },
  desktopImage: "/products/midnight-navy-silk-tie.svg",
  mobileImage: null,
  imageAlt: "Midnight Navy Silk Tie",
  accentImage: {
    src: "/products/gold-tone-knot-cufflinks.svg",
    alt: "Gold-Tone Knot Cufflinks",
  },
  accentLabel: "Est. attention to detail",
  productCallouts: [],
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fallbackSlides(): HeroCarouselSlide[] {
  return [FALLBACK_SLIDE];
}

async function loadHeroSlides(): Promise<HeroCarouselSlide[]> {
  if (!isSupabaseConfigured) return fallbackSlides();

  try {
    const now = new Date().toISOString();
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("site_banners")
      .select(
        "id, location, title, subtitle, cta_text, cta_link, image_url, mobile_image_url, enabled, sort_order, product_1_id, product_2_id, starts_at, ends_at, created_at",
      )
      .eq("location", "home-hero")
      .eq("enabled", true)
      // Keep these explicit even if this loader is later switched to an admin
      // session: previews must never leak scheduled or expired rows into home.
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) {
        console.error("hero carousel: banner query failed —", error.message);
      }
      return fallbackSlides();
    }

    const rows = data as unknown as SiteBannerRow[];
    const productIds = Array.from(
      new Set(
        rows.flatMap((row) =>
          [row.product_1_id, row.product_2_id].filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ),
    );
    const products = productIds.length > 0 ? await getProductsByIds(productIds) : [];
    const activeProducts = new Map(
      products.filter((product) => product.active).map((product) => [product.id, product]),
    );

    const slides: HeroCarouselSlide[] = [];
    for (const row of rows) {
      const desktopImage = normalizeImageSource(row.image_url);
      if (!desktopImage) continue;

      const title = text(row.title);
      const subtitle = text(row.subtitle);
      const ctaText = text(row.cta_text);
      const safeCta = normalizeOutboundUrl(row.cta_link, {
        allowExternal: true,
        optional: true,
      });
      const mobileImage = row.mobile_image_url
        ? normalizeImageSource(row.mobile_image_url)
        : null;

      const productCallouts: BannerProductCallout[] = [];
      const slots = [
        { slot: 1 as const, id: row.product_1_id },
        { slot: 2 as const, id: row.product_2_id },
      ];
      for (const { slot, id } of slots) {
        if (!id) continue;
        const product = activeProducts.get(id);
        if (!product) continue;
        productCallouts.push({
          slot,
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          image: product.images[0]
            ? normalizeImageSource(product.images[0])
            : null,
        });
      }

      slides.push({
        id: row.id,
        source: "cms",
        eyebrow: null,
        title,
        subtitle,
        cta:
          ctaText && safeCta
            ? {
                text: ctaText,
                href: safeCta,
              }
            : null,
        desktopImage,
        mobileImage,
        imageAlt: title || "Hero banner",
        accentImage: null,
        accentLabel: null,
        productCallouts,
      });
    }

    return slides.length > 0 ? slides : fallbackSlides();
  } catch (error) {
    console.error(
      "hero carousel: unable to load banners —",
      error instanceof Error ? error.message : error,
    );
    return fallbackSlides();
  }
}

/** Server loader: CMS/database work stays out of the interactive client. */
export async function Hero() {
  noStore();
  const slides = await loadHeroSlides();
  return <HeroCarousel slides={slides} />;
}
