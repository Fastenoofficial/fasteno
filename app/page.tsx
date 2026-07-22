import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getCategories, getFeaturedProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Hero } from "@/components/home/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { OccasionStrip } from "@/components/home/OccasionStrip";
import { CraftsmanshipBand } from "@/components/home/CraftsmanshipBand";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";
import Link from "next/link";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Premium Ties, Cufflinks & Formal Accessories`,
  description: `${SITE_TAGLINE} Shop premium silk ties, cufflinks, brooches, pocket squares, buttons and gift sets. Free shipping over ₹1,499, Cash on Delivery and 7-day returns across India.`,
};

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      <Hero />

      {/* category tiles */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="The collections"
          title="Shop by Category"
          description="Six essentials of the well-finished wardrobe — each piece curated, never crowded."
        />
        <CategoryTiles categories={categories} />
      </section>

      {/* featured products */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            eyebrow="Editor's picks"
            title="Featured Pieces"
            description="Bestsellers and new arrivals our stylists reach for first."
          >
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-gold transition-colors hover:text-gold-light"
            >
              View all <ArrowRight size={14} aria-hidden />
            </Link>
          </SectionHeading>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* shop by occasion */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="Dress the moment"
          title="Shop by Occasion"
          description="From the mandap to the boardroom — accessories matched to the moments that matter."
        />
        <OccasionStrip />
      </section>

      <CraftsmanshipBand />

      <NewsletterSignup />
    </>
  );
}
