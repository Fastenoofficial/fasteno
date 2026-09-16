import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAllProducts, getCategories, getFilterOptions } from "@/lib/catalog";
import { ProductGridSkeleton } from "@/components/ui/StorefrontSkeleton";
import ShopClient from "./shop-client";

export const metadata: Metadata = {
  title: "Shop All Accessories",
  description:
    "Browse the full Fasteno Shyama collection — silk ties, cufflinks, brooches, pocket squares, buttons and gift sets. Filter by colour, material, pattern, price and occasion.",
};

// Force static rendering with ISR
export const dynamic = "force-static";
export const revalidate = 3600;

async function getStaticShopData() {
  const [products, options, categories] = await Promise.all([
    getAllProducts(),
    getFilterOptions(),
    getCategories(),
  ]);

  return { products, options, categories };
}

export default async function ShopPage() {
  const data = await getStaticShopData();

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <header className="mb-10 grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-3">The Collection</p>
            <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-ivory md:text-5xl">
              Shop All
            </h1>
            <div className="gold-rule mt-4" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-[15px]">
              Every finishing touch in one place — ties, cufflinks, brooches,
              pocket squares, buttons and gift sets, curated for weddings, the
              office and festive evenings.
            </p>
          </div>
        </header>

        {/* category quick links */}
        <nav
          aria-label="Categories"
          className="no-scrollbar mb-8 flex w-full items-center gap-1 overflow-x-auto rounded-full bg-line-soft p-1"
        >
          <span className="inline-flex shrink-0 items-center rounded-full bg-keynote px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
            All
          </span>
          {data.categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="inline-flex shrink-0 items-center rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:bg-card hover:text-ivory"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ShopClient {...data} />
        </Suspense>
      </div>
    </section>
  );
}
