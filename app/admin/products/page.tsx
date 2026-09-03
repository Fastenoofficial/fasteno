import type { Metadata } from "next";
import { Download, Package, Plus } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductsTable } from "@/components/admin/ProductsTable";

export const metadata: Metadata = {
  title: "Products",
};

interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  featured: boolean;
  active: boolean;
  images: string[] | null;
  categories: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    deleted?: string;
    activated?: string;
    deactivated?: string;
    featured?: string;
    unfeatured?: string;
    categorized?: string;
    error?: string;
  }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { deleted, activated, deactivated, featured, unfeatured, categorized, error } =
    await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Fetch products with category details
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, stock, featured, active, images, categories(slug, name)",
    )
    .order("created_at", { ascending: false });

  const products = (data ?? []) as AdminProductRow[];

  // Fetch all categories for bulk actions dropdown
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const categories = categoriesData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Products</h2>
          <p className="mt-1 text-sm text-muted">
            {products.length} in the catalog
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/admin/export/products"
            className="inline-flex items-center gap-2 border border-gold-light px-4 py-2 text-xs font-medium uppercase tracking-[0.05em] text-ivory transition-colors hover:bg-surface"
          >
            <Download size={14} />
            Export CSV
          </a>
          <Button href="/admin/products/new" variant="primary" size="sm">
            <Plus size={14} />
            New Product
          </Button>
        </div>
      </div>

      {deleted && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {deleted} product(s) deleted successfully.
        </p>
      )}
      {activated && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {activated} product(s) activated successfully.
        </p>
      )}
      {deactivated && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {deactivated} product(s) deactivated successfully.
        </p>
      )}
      {featured && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {featured} product(s) marked as featured.
        </p>
      )}
      {unfeatured && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {unfeatured} product(s) removed from featured.
        </p>
      )}
      {categorized && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {categorized} product(s) category changed.
        </p>
      )}
      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={32} strokeWidth={1.5} />}
          title="No products yet"
          description="Add your first product to start selling."
          actionLabel="New Product"
          actionHref="/admin/products/new"
        />
      ) : (
        <ProductsTable products={products} categories={categories} />
      )}
    </div>
  );
}
