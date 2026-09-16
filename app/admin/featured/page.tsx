import type { Metadata } from "next";
import Link from "next/link";
import { Star, Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  moveFeaturedProduct,
  unfeatureFeaturedProduct,
} from "@/components/admin/featured-actions";

export const metadata: Metadata = {
  title: "Featured Products",
};

interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  featured_order: number;
  active: boolean;
  images: string[] | null;
  categories:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
}

export default async function FeaturedProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    updated?: string;
    moved?: string;
    error?: string;
  }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { updated, moved, error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data, error: loadError } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, featured_order, active, images, created_at, categories(slug, name)",
    )
    .eq("featured", true)
    .order("featured_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (loadError) {
    console.error("featured page: load failed —", loadError.message);
  }
  const products = (data ?? []) as FeaturedProduct[];
  const lastIndex = products.length - 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Featured Products</h2>
          <p className="mt-1 text-sm text-muted">
            {products.length} products featured on home page
          </p>
        </div>
        <Button href="/admin/products" variant="outline" size="sm">
          <Plus aria-hidden size={14} />
          Feature More Products
        </Button>
      </div>

      {(updated || moved) && (
        <p
          role="status"
          className="border border-success/50 bg-card px-4 py-3 text-sm text-success"
        >
          {moved
            ? "Featured product order updated successfully."
            : "Featured products updated successfully."}
        </p>
      )}
      {(error || loadError) && (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error ?? "Unable to load featured products. Please refresh and try again."}
        </p>
      )}

      {!loadError && products.length === 0 ? (
        <EmptyState
          icon={<Star size={32} strokeWidth={1.5} />}
          title="No featured products"
          description="Mark products as featured to showcase them on your home page."
          actionLabel="Go to Products"
          actionHref="/admin/products"
        />
      ) : !loadError ? (
        <ol className="space-y-3">
          {products.map((product, index) => (
            <li
              key={product.id}
              className="flex flex-col gap-4 border border-line bg-card p-4 transition-colors hover:bg-surface sm:flex-row sm:items-center"
            >
              <div className="flex gap-1 sm:flex-col">
                <form action={moveFeaturedProduct.bind(null, product.id, -1)}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    aria-label={`Move ${product.name} earlier`}
                    title="Move earlier"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold-light hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden size={17} />
                  </button>
                </form>
                <form action={moveFeaturedProduct.bind(null, product.id, 1)}>
                  <button
                    type="submit"
                    disabled={index === lastIndex}
                    aria-label={`Move ${product.name} later`}
                    title="Move later"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold-light hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden size={17} />
                  </button>
                </form>
              </div>

              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-16 rounded border border-line object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded border border-line bg-surface" />
              )}

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${product.slug}`}
                  className="font-medium text-ivory hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                  target="_blank"
                  rel="noreferrer"
                >
                  {product.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span>{formatINR(product.price)}</span>
                  {product.categories && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {Array.isArray(product.categories)
                          ? product.categories[0]?.name
                          : product.categories.name}
                      </span>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>Position {index + 1}</span>
                  {!product.active && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-danger">Archived</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="inline-flex min-h-11 items-center gap-1 px-3 text-xs text-muted transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                >
                  Edit Product
                </Link>
                <form action={unfeatureFeaturedProduct.bind(null, product.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center gap-1 px-3 text-xs text-danger transition-colors hover:text-danger-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  >
                    <X aria-hidden size={12} />
                    Unfeature
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="text-xs text-muted">
        <p>
          <strong>Tip:</strong> Use the arrows to reorder featured products. The
          order here determines the display order on your home page.
        </p>
      </div>
    </div>
  );
}
