import { Button } from "@/components/ui/Button";
import { SITE_TAGLINE } from "@/lib/config";

/** Editorial light hero — charcoal display headline on warm paper, twin CTAs
 *  and a layered product-art composition. Server component (no interactivity). */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        {/* copy */}
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

        {/* layered product art */}
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
