import type { Metadata } from "next";
import Link from "next/link";
import { Star, Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toggleFeatured, updateFeaturedOrder } from "@/components/admin/featured-actions";

export const metadata: Metadata = {
  title: "Featured Products",
};

interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  featured_order: number;
  images: string[] | null;
  categories: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

export default async function FeaturedProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { updated, error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("id, slug, name, price, featured_order, images, categories(slug, name)")
    .eq("featured", true)
    .order("featured_order", { ascending: true });

  const products = (data ?? []) as FeaturedProduct[];

  async function moveUp(productId: string, currentOrder: number) {
    "use server";
    if (currentOrder === 0) return;

    await requireAdmin();
    const supabase = await (await import("@/lib/supabase/server")).createClient();

    // Swap with previous item
    const { data: prevProduct } = await supabase
      .from("products")
      .select("id")
      .eq("featured", true)
      .eq("featured_order", currentOrder - 1)
      .single();

    if (prevProduct) {
      await supabase
        .from("products")
        .update({ featured_order: currentOrder })
        .eq("id", prevProduct.id);

      await supabase
        .from("products")
        .update({ featured_order: currentOrder - 1 })
        .eq("id", productId);
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/featured");
    revalidatePath("/");
  }

  async function moveDown(productId: string, currentOrder: number, maxOrder: number) {
    "use server";
    if (currentOrder >= maxOrder) return;

    await requireAdmin();
    const supabase = await (await import("@/lib/supabase/server")).createClient();

    // Swap with next item
    const { data: nextProduct } = await supabase
      .from("products")
      .select("id")
      .eq("featured", true)
      .eq("featured_order", currentOrder + 1)
      .single();

    if (nextProduct) {
      await supabase
        .from("products")
        .update({ featured_order: currentOrder })
        .eq("id", nextProduct.id);

      await supabase
        .from("products")
        .update({ featured_order: currentOrder + 1 })
        .eq("id", productId);
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/featured");
    revalidatePath("/");
  }

  async function unfeature(productId: string) {
    "use server";
    await toggleFeatured(productId, false);
    const { revalidatePath } = await import("next/cache");
    const { redirect } = await import("next/navigation");
    revalidatePath("/admin/featured");
    redirect("/admin/featured");
  }

  const maxOrder = products.length - 1;

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
          <Plus size={14} />
          Feature More Products
        </Button>
      </div>

      {updated && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Featured products updated successfully.
        </p>
      )}
      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={<Star size={32} strokeWidth={1.5} />}
          title="No featured products"
          description="Mark products as featured to showcase them on your home page."
          actionLabel="Go to Products"
          actionHref="/admin/products"
        />
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center gap-4 border border-line bg-card p-4 transition-colors hover:bg-surface"
            >
              <div className="flex flex-col gap-1">
                <form action={moveUp.bind(null, product.id, product.featured_order)}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-ivory disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp size={16} />
                  </button>
                </form>
                <form action={moveDown.bind(null, product.id, product.featured_order, maxOrder)}>
                  <button
                    type="submit"
                    disabled={index === maxOrder}
                    className="rounded p-1 text-muted transition-colors hover:bg-surface hover:text-ivory disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown size={16} />
                  </button>
                </form>
              </div>

              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-16 w-16 rounded border border-line object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded border border-line bg-surface" />
              )}

              <div className="flex-1">
                <Link
                  href={`/product/${product.slug}`}
                  className="font-medium text-ivory hover:text-gold"
                  target="_blank"
                >
                  {product.name}
                </Link>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <span>{formatINR(product.price)}</span>
                  {product.categories && (
                    <>
                      <span>·</span>
                      <span>
                        {Array.isArray(product.categories)
                          ? product.categories[0]?.name
                          : product.categories.name}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span>Position {index + 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory"
                >
                  Edit Product
                </Link>
                <form action={unfeature.bind(null, product.id)}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-danger transition-colors hover:text-danger-light"
                  >
                    <X size={12} />
                    Unfeature
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted">
        <p>
          <strong>Tip:</strong> Use the arrows to reorder featured products. The order here determines
          the display order on your home page.
        </p>
      </div>
    </div>
  );
}
