import type { Metadata } from "next";
import Link from "next/link";
import { Download, Package, Plus } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatINR, titleCase } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DuplicateProductButton } from "@/components/admin/DuplicateProductButton";

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
  categories: { slug: string } | { slug: string }[] | null;
}

function categorySlug(row: AdminProductRow): string {
  if (!row.categories) return "";
  return Array.isArray(row.categories)
    ? (row.categories[0]?.slug ?? "")
    : row.categories.slug;
}

export default async function AdminProductsPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  // admin sees inactive (archived) products too — RLS allows it
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, stock, featured, active, images, categories(slug)",
    )
    .order("created_at", { ascending: false });

  const products = (data ?? []) as AdminProductRow[];

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
          {/* plain <a> — a full navigation download, no Link prefetching */}
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

      {products.length === 0 ? (
        <EmptyState
          icon={<Package size={32} strokeWidth={1.5} />}
          title="No products yet"
          description="Add your first product to start selling."
          actionLabel="New Product"
          actionHref="/admin/products/new"
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={p.images?.[0] ?? ""}
                        alt=""
                        loading="lazy"
                        className="h-12 w-10 shrink-0 border border-line bg-surface object-cover"
                      />
                      <span className="text-ivory transition-colors hover:text-gold">
                        {p.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {titleCase(categorySlug(p))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-ivory">{formatINR(p.price)}</span>
                    {p.compare_at_price != null && (
                      <span className="ml-2 text-xs text-muted line-through">
                        {formatINR(p.compare_at_price)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.stock === 0
                          ? "text-danger"
                          : p.stock <= 5
                            ? "text-gold"
                            : "text-muted"
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {p.active ? (
                        <Badge tone="success">Live</Badge>
                      ) : (
                        <Badge tone="muted">Archived</Badge>
                      )}
                      {p.featured && <Badge tone="gold">Featured</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DuplicateProductButton productId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
