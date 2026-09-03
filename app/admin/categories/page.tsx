import type { Metadata } from "next";
import Link from "next/link";
import { Grid, Plus, Pencil, Trash2 } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteCategory } from "@/components/admin/category-actions";

export const metadata: Metadata = {
  title: "Categories",
};

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  display_on_home: boolean;
  image_url: string | null;
  product_count?: number;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { created, updated, deleted, error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Fetch categories with product count
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, display_on_home, image_url")
    .order("sort_order", { ascending: true });

  const categories = (data ?? []) as CategoryRow[];

  // Get product counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", cat.id);
      return { ...cat, product_count: count ?? 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Categories</h2>
          <p className="mt-1 text-sm text-muted">
            {categories.length} categories in the catalog
          </p>
        </div>
        <Button href="/admin/categories/new" variant="primary" size="sm">
          <Plus size={14} />
          New Category
        </Button>
      </div>

      {created && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Category created successfully.
        </p>
      )}
      {updated && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Category updated successfully.
        </p>
      )}
      {deleted && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Category deleted successfully.
        </p>
      )}
      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {categoriesWithCounts.length === 0 ? (
        <EmptyState
          icon={<Grid size={32} strokeWidth={1.5} />}
          title="No categories yet"
          description="Create your first category to organize products."
          actionLabel="New Category"
          actionHref="/admin/categories/new"
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Home Page</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categoriesWithCounts.map((cat) => (
                <tr key={cat.id} className="transition-colors hover:bg-surface">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt=""
                          className="h-10 w-10 rounded border border-line object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border border-line bg-surface flex items-center justify-center">
                          <Grid size={16} className="text-muted" />
                        </div>
                      )}
                      <span className="font-medium text-ivory">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-muted">{cat.slug}</td>
                  <td className="px-4 py-4 text-muted">{cat.product_count}</td>
                  <td className="px-4 py-4 text-muted">{cat.sort_order}</td>
                  <td className="px-4 py-4">
                    {cat.display_on_home ? (
                      <span className="text-xs text-success">Yes</span>
                    ) : (
                      <span className="text-xs text-muted">No</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/categories/${cat.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory"
                      >
                        <Pencil size={12} />
                        Edit
                      </Link>
                      <form action={deleteCategory.bind(null, cat.id)}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-danger transition-colors hover:text-danger-light disabled:opacity-50"
                          disabled={cat.product_count > 0}
                          title={cat.product_count > 0 ? "Cannot delete category with products" : "Delete category"}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-muted">
        <p>
          <strong>Note:</strong> Categories with products cannot be deleted.
          Reassign products to another category first.
        </p>
      </div>
    </div>
  );
}
