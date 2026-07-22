import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategories,
  getCategoryBySlug,
  getFilterOptions,
  getProducts,
} from "@/lib/catalog";
import { ProductListing } from "@/components/catalog/ProductListing";
import {
  parseListingParams,
  toProductQuery,
  type ListingSearchParams,
} from "@/components/catalog/query";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<ListingSearchParams>;
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

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ category }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const listing = parseListingParams(sp);
  const [products, options, categories] = await Promise.all([
    getProducts(toProductQuery(listing, cat.slug)),
    getFilterOptions(cat.slug),
    getCategories(),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
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

      <header className="mb-10">
        <p className="eyebrow mb-3">The Collection</p>
        <h1 className="font-display text-4xl text-ivory md:text-5xl">
          {cat.name}
        </h1>
        <div className="gold-rule mt-4" />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          {cat.description}
        </p>
      </header>

      {/* category quick links */}
      <nav
        aria-label="Categories"
        className="mb-8 flex flex-wrap gap-2 border-b border-line pb-8"
      >
        <Link
          href="/shop"
          className="inline-flex items-center border border-line px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-gold hover:text-gold"
        >
          All
        </Link>
        {categories.map((c) =>
          c.slug === cat.slug ? (
            <span
              key={c.slug}
              className="inline-flex items-center border border-block bg-block px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-block-text"
            >
              {c.name}
            </span>
          ) : (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="inline-flex items-center border border-line px-3.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-gold hover:text-gold"
            >
              {c.name}
            </Link>
          ),
        )}
      </nav>

      <ProductListing
        basePath={`/shop/${cat.slug}`}
        products={products}
        params={listing}
        options={options}
      />
    </section>
  );
}
