import { Button } from "@/components/ui/Button";
import { SITE_TAGLINE } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

/** Editorial hero with dynamic banner from admin panel */
export async function Hero() {
  const supabase = await createClient();

  // Fetch enabled home-hero banner
  const { data: banner } = await supabase
    .from("site_banners")
    .select("*")
    .eq("location", "home-hero")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .single();

  // Fallback to default content if no banner
  if (!banner) {
    return (
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <p className="eyebrow mb-5">Fine formal accessories · Made for India</p>
            <h1 className="font-display text-4xl leading-[1.12] text-ivory sm:text-5xl lg:text-6xl">
              {SITE_TAGLINE.replace(/\.$/, "")}
              <span className="text-gold">.</span>
            </h1>
            <div className="gold-rule mt-6" />
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
              Silk ties, sculpted cufflinks, heirloom brooches and pocket squares
              — curated for weddings, boardrooms and festive evenings. The
              details that finish a man&rsquo;s attire.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button href="/shop" size="lg">
                Shop the Collection
              </Button>
              <Button href="/shop/gift-sets" variant="outline" size="lg">
                Explore Gift Sets
              </Button>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-md sm:block lg:max-w-none">
            <div className="relative aspect-[4/5] w-3/4 border border-line bg-card">
              <img
                src="/products/midnight-navy-silk-tie.svg"
                alt="Midnight Navy Silk Tie"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 right-0 w-1/2 border border-gold/40 bg-card shadow-[0_8px_30px_rgba(26,28,28,0.10)]">
              <img
                src="/products/gold-tone-knot-cufflinks.svg"
                alt="Gold-Tone Knot Cufflinks"
                className="aspect-square h-auto w-full object-cover"
              />
            </div>
            <p className="eyebrow absolute -left-2 bottom-10 hidden -rotate-90 lg:block">
              Est. attention to detail
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Dynamic banner from admin
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <picture>
          {banner.mobile_image_url && (
            <source media="(max-width: 768px)" srcSet={banner.mobile_image_url} />
          )}
          <img
            src={banner.image_url}
            alt={banner.title || "Hero banner"}
            className="h-full w-full object-cover"
          />
        </picture>
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-32">
        <div className="max-w-xl">
          {banner.title && (
            <h1 className="font-display text-4xl leading-[1.12] text-ivory sm:text-5xl lg:text-6xl">
              {banner.title}
              <span className="text-gold">.</span>
            </h1>
          )}
          {banner.subtitle && (
            <>
              <div className="gold-rule mt-6" />
              <p className="mt-6 text-base leading-relaxed text-muted lg:text-lg">
                {banner.subtitle}
              </p>
            </>
          )}
          {banner.cta_text && banner.cta_link && (
            <div className="mt-9">
              <Button href={banner.cta_link} size="lg">
                {banner.cta_text}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
