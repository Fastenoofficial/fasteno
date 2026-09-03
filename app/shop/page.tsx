import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAllProducts, getCategories, getFilterOptions } from "@/lib/catalog";
import ShopClient from "./shop-client";

export const metadata: Metadata = {
  title: "Shop All Accessories",
  description:
    "Browse the full Fasteno Shyama collection — silk ties, cufflinks, brooches, pocket squares, buttons and gift sets. Filter by colour, material, pattern, price and occasion.",
};

// Force static rendering with ISR
export const dynamic = 'force-static';
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
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <header className="mb-10">
        <p className="eyebrow mb-3">The Collection</p>
        <h1 className="font-display text-4xl text-ivory md:text-5xl">
          Shop All
        </h1>
        <div className="gold-rule mt-4" />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Every finishing touch in one place — ties, cufflinks, brooches,
          pocket squares, buttons and gift sets, curated for weddings, the
          office and festive evenings.
        </p>
      </header>

      {/* category quick links */}
      <nav
        aria-label="Categories"
        className="mb-8 flex flex-wrap gap-2 border-b border-line pb-8"
      >
        <span className="inline-flex items-center border border-block bg-block px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-block-text">
          All
        </span>
        {data.categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop/${c.slug}`}
            className="inline-flex items-center border border-line px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-gold hover:text-gold"
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <Suspense fallback={<div className="text-muted">Loading...</div>}>
        <ShopClient {...data} />
      </Suspense>
    </section>
  );
}
