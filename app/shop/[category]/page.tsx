import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getCategories,
  getCategoryBySlug,
  getFilterOptions,
  getAllProducts,
} from "@/lib/catalog";
import { ProductGridSkeleton } from "@/components/ui/StorefrontSkeleton";
import CategoryClient from "./category-client";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Category not found" };
  return {
    title: `${cat.name} — Shop`,
    description: cat.description,
  };
}

// Pre-generate all category pages at build time
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((cat) => ({
    category: cat.slug,
  }));
}

// Force static rendering with ISR
export const dynamic = "force-static";
export const revalidate = 3600;

async function getCategoryData(categorySlug: string) {
  const [allProducts, cat, options, categories] = await Promise.all([
    getAllProducts(),
    getCategoryBySlug(categorySlug),
    getFilterOptions(categorySlug),
    getCategories(),
  ]);

  // Filter products for this category
  const products = allProducts.filter((p) => p.category === categorySlug);

  return { products, category: cat, options, categories };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const data = await getCategoryData(category);
  if (!data.category) notFound();

  const cat = data.category;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        {/* breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-gold">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/shop" className="transition-colors hover:text-gold">
                Shop
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-gold">
              {cat.name}
            </li>
          </ol>
        </nav>

        <header className="mb-10 grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-3">The Collection</p>
            <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-ivory md:text-5xl">
              {cat.name}
            </h1>
            <div className="gold-rule mt-4" />
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-[15px]">
              {cat.description}
            </p>
          </div>
        </header>

        {/* category quick links */}
        <nav
          aria-label="Categories"
          className="no-scrollbar mb-8 flex w-full items-center gap-1 overflow-x-auto rounded-full bg-line-soft p-1"
        >
          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:bg-card hover:text-ivory"
          >
            All
          </Link>
          {data.categories.map((c) =>
            c.slug === cat.slug ? (
              <span
                key={c.slug}
                className="inline-flex shrink-0 items-center rounded-full bg-keynote px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm"
              >
                {c.name}
              </span>
            ) : (
              <Link
                key={c.slug}
                href={`/shop/${c.slug}`}
                className="inline-flex shrink-0 items-center rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:bg-card hover:text-ivory"
              >
                {c.name}
              </Link>
            ),
          )}
        </nav>

        <Suspense fallback={<ProductGridSkeleton />}>
          <CategoryClient {...data} category={cat} />
        </Suspense>
      </div>
    </section>
  );
}
