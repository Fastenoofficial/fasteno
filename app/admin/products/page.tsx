import type { Metadata } from "next";
import Link from "next/link";
import { Download, Package, Plus } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin-constants";
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
  categories:
    | { slug: string; name: string }
    | { slug: string; name: string }[]
    | null;
}

function safeActionCount(value: string | undefined): string | null {
  return value && /^\d{1,4}$/.test(value) ? value : null;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stock?: string;
    archived?: string;
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

  const params = await searchParams;
  const lowStockOnly = params.stock === "low";
  const archived = safeActionCount(params.archived);
  const activated = safeActionCount(params.activated);
  const deactivated = safeActionCount(params.deactivated);
  const featured = safeActionCount(params.featured);
  const unfeatured = safeActionCount(params.unfeatured);
  const categorized = safeActionCount(params.categorized);
  const actionError = (params.error ?? "").trim().slice(0, 240);

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  let productQuery = supabase
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, stock, featured, active, images, categories(slug, name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (lowStockOnly) {
    productQuery = productQuery
      .eq("active", true)
      .lte("stock", LOW_STOCK_THRESHOLD);
  }

  const [productResult, categoryResult, lowStockResult] = await Promise.all([
    productQuery,
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .lte("stock", LOW_STOCK_THRESHOLD),
  ]);

  const products = (productResult.data ?? []) as AdminProductRow[];
  const resultCount = productResult.count ?? products.length;
  const lowStockCount = lowStockResult.count ?? 0;
  const categories = categoryResult.data ?? [];
  const loadError = productResult.error
    ? "Products are temporarily unavailable. Please refresh and try again."
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Products</h2>
          <p className="mt-1 text-sm text-muted">
            {lowStockOnly
              ? `${resultCount} active product${resultCount === 1 ? "" : "s"} at ${LOW_STOCK_THRESHOLD} units or fewer`
              : `${resultCount} in the catalog`}
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

      <nav aria-label="Product stock filters" className="flex flex-wrap gap-2">
        <Link
          href="/admin/products"
          aria-current={!lowStockOnly ? "page" : undefined}
          className={`border px-3 py-1.5 text-xs uppercase tracking-[0.05em] transition-colors ${
            !lowStockOnly
              ? "border-gold bg-surface text-gold"
              : "border-line text-muted hover:border-gold-light hover:text-ivory"
          }`}
        >
          All products
        </Link>
        <Link
          href="/admin/products?stock=low"
          aria-current={lowStockOnly ? "page" : undefined}
          className={`border px-3 py-1.5 text-xs uppercase tracking-[0.05em] transition-colors ${
            lowStockOnly
              ? "border-gold bg-surface text-gold"
              : "border-line text-muted hover:border-gold-light hover:text-ivory"
          }`}
        >
          Low stock ({lowStockResult.error ? "—" : lowStockCount})
        </Link>
      </nav>

      {archived && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          {archived} product(s) archived. They can be activated again later.
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
      {(actionError || loadError) && (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {actionError || loadError}
        </p>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={32} strokeWidth={1.5} />}
          title={lowStockOnly ? "No low-stock products" : "No products yet"}
          description={
            lowStockOnly
              ? `No active products currently have ${LOW_STOCK_THRESHOLD} units or fewer.`
              : "Add your first product to start selling."
          }
          actionLabel={lowStockOnly ? "View all products" : "New Product"}
          actionHref={lowStockOnly ? "/admin/products" : "/admin/products/new"}
        />
      ) : (
        <ProductsTable products={products} categories={categories} />
      )}
    </div>
  );
}
