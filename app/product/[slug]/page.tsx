import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import {
  getCategoryBySlug,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/catalog";
import { formatINR, titleCase } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, isShiprocketConfigured } from "@/lib/config";
import { Badge } from "@/components/ui/Badge";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductCard } from "@/components/ui/ProductCard";
import {
  ProductListAnalytics,
  ProductViewAnalytics,
} from "@/lib/analytics-client";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { AddToCartPanel } from "@/components/catalog/AddToCartPanel";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { Stars } from "@/components/reviews/Stars";
import { getProductRating, getProductReviews } from "@/components/reviews/data";
import { DeliveryEstimate } from "@/components/product/DeliveryEstimate";
import { DeliveryCheck } from "@/components/product/DeliveryCheck";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const title = product.metaTitle || product.name;
  const description = product.metaDescription || product.description;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
  };
}

const LOW_STOCK_AT = 5;

// Pre-generate all product pages at build time.
export async function generateStaticParams() {
  const { getAllProducts } = await import("@/lib/catalog");
  const products = await getAllProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

// Revalidate every 5 minutes — balance between freshness and speed.
export const revalidate = 300;
export const dynamicParams = true;
export const dynamic = "force-static";

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Rating is fetched once and shared by JSON-LD and the reviews section.
  const [category, related, rating] = await Promise.all([
    getCategoryBySlug(product.category),
    getRelatedProducts(product, 4),
    getProductRating(product.id),
  ]);
  const jsonLdReviews =
    rating.count > 0 ? await getProductReviews(product.id) : [];
  const categoryName = category?.name ?? titleCase(product.category);

  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock <= LOW_STOCK_AT;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:py-16">
      <ProductJsonLd product={product} rating={rating} reviews={jsonLdReviews} />
      <ProductViewAnalytics product={product} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
          { name: categoryName, url: `/shop/${product.category}` },
          { name: product.name, url: `/product/${product.slug}` },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
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
          <li>
            <Link
              href={`/shop/${product.category}`}
              className="transition-colors hover:text-gold"
            >
              {categoryName}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-gold">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />

        <div className="flex min-w-0 flex-col">
          <p className="eyebrow mb-3">{categoryName}</p>
          <h1 className="break-words font-display text-3xl leading-tight text-ivory md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <PriceTag
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size="lg"
              showDiscount
            />
            {outOfStock ? (
              <Badge tone="danger">Sold out</Badge>
            ) : lowStock ? (
              <Badge tone="danger">Only {product.stock} left</Badge>
            ) : (
              <Badge tone="success">In stock</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Inclusive of all taxes</p>

          {rating.count > 0 && (
            <a
              href="#reviews"
              className="mt-3 inline-flex w-fit items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
            >
              <Stars rating={rating.average} size={14} />
              <span>
                {rating.average.toFixed(1)} · {rating.count} review
                {rating.count === 1 ? "" : "s"}
              </span>
            </a>
          )}

          <p className="mt-6 text-sm leading-relaxed text-muted">
            {product.description}
          </p>

          <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line-soft bg-line sm:grid-cols-3">
            {(
              [
                ["Material", titleCase(product.material)],
                ["Colour", titleCase(product.color)],
                ["Pattern", titleCase(product.pattern)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="min-w-0 bg-card px-4 py-3">
                <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-sm text-ivory">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted">
            Country of origin: <span className="text-ivory">India</span>
          </p>

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Link key={tag} href={`/shop?tag=${encodeURIComponent(tag)}`}>
                  <Badge tone="muted">{titleCase(tag)}</Badge>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <AddToCartPanel product={product} />
            <DeliveryEstimate />
            {isShiprocketConfigured && <DeliveryCheck />}
            <Link
              href={
                product.category === "ties"
                  ? "/guides/how-to-tie-a-tie"
                  : product.category === "cufflinks"
                    ? "/guides/cufflink-guide"
                    : product.category === "pocket-squares"
                      ? "/guides/silk-care"
                      : "/guides"
              }
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-gold"
            >
              <BookOpen size={13} aria-hidden />
              Size &amp; care guide
            </Link>
          </div>

          {product.details.length > 0 && (
            <div className="mt-10 border-t border-line pt-6">
              <h2 className="text-xs uppercase tracking-[0.18em] text-gold">
                Details &amp; Craft
              </h2>
              <ul className="mt-4 space-y-2">
                {product.details.map((detail) => (
                  <li
                    key={detail}
                    className="flex gap-3 text-sm leading-relaxed text-muted"
                  >
                    <span
                      aria-hidden
                      className="mt-2 h-px w-4 shrink-0 bg-gold/60"
                    />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 space-y-3 rounded-2xl border border-line-soft bg-card p-5 shadow-[var(--shadow-card)]">
            <p className="flex items-start gap-3 text-sm text-muted">
              <Truck
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0 text-gold"
              />
              Free shipping on orders over {formatINR(FREE_SHIPPING_THRESHOLD)} ·
              delivered across India in 3–7 working days.
            </p>
            <p className="flex items-start gap-3 text-sm text-muted">
              <RotateCcw
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0 text-gold"
              />
              7-day easy returns on unworn pieces in original packaging.
            </p>
            <p className="flex items-start gap-3 text-sm text-muted">
              <ShieldCheck
                size={16}
                aria-hidden
                className="mt-0.5 shrink-0 text-gold"
              />
              Secure payment — UPI, cards, netbanking &amp; Cash on Delivery.
            </p>
          </div>
        </div>
      </div>

      <ReviewsSection product={product} rating={rating} />

      {related.length > 0 && (
        <div className="mt-20 border-t border-line pt-14">
          <SectionHeading
            eyebrow="Complete the look"
            title="Pairs Well With"
            description="Pieces chosen to sit alongside this one — same palette, same occasions."
          />
          <ProductListAnalytics list="related_products" products={related} />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((relatedProduct, index) => (
              <ProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                listContext="related_products"
                position={index}
              />
            ))}
          </div>
        </div>
      )}

      <RecentlyViewed slug={product.slug} />
    </section>
  );
}
