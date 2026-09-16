import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Grid,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  deleteCategory,
  moveCategory,
} from "@/components/admin/category-actions";

export const metadata: Metadata = {
  title: "Categories",
};

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  display_on_home: boolean | null;
  image_url: string | null;
  product_count?: number | null;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    moved?: string;
    error?: string;
  }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { created, updated, deleted, moved, error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data, error: categoriesError } = await supabase
    .from("categories")
    .select("id, slug, name, description, sort_order, display_on_home, image_url")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (categoriesError) {
    console.error("category page: list load failed —", categoriesError.message);
  }
  const categories = (data ?? []) as CategoryRow[];

  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", category.id);
      if (countError) {
        console.error(
          `category page: product count failed for ${category.id} —`,
          countError.message,
        );
      }
      return {
        ...category,
        product_count: countError ? null : (count ?? 0),
      };
    }),
  );

  const successMessage = created
    ? "Category created successfully."
    : updated
      ? "Category updated successfully."
      : deleted
        ? "Category deleted successfully."
        : moved
          ? "Category order updated successfully."
          : null;

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
          <Plus aria-hidden size={14} />
          New Category
        </Button>
      </div>

      {successMessage && (
        <p
          role="status"
          className="border border-success/50 bg-card px-4 py-3 text-sm text-success"
        >
          {successMessage}
        </p>
      )}
      {(error || categoriesError) && (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error ?? "Unable to load categories. Please refresh and try again."}
        </p>
      )}

      {!categoriesError && categoriesWithCounts.length === 0 ? (
        <EmptyState
          icon={<Grid size={32} strokeWidth={1.5} />}
          title="No categories yet"
          description="Create your first category to organize products."
          actionLabel="New Category"
          actionHref="/admin/categories/new"
        />
      ) : !categoriesError ? (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
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
              {categoriesWithCounts.map((category, index) => {
                const deleteDisabled = category.product_count !== 0;
                const deleteTitle =
                  category.product_count === null
                    ? "Product count unavailable; refresh before deleting"
                    : category.product_count > 0
                      ? "Cannot delete category with products"
                      : "Delete category";

                return (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-surface"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 rounded border border-line object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded border border-line bg-surface">
                            <Grid aria-hidden size={16} className="text-muted" />
                          </div>
                        )}
                        <span className="font-medium text-ivory">
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted">{category.slug}</td>
                    <td className="px-4 py-4 text-muted">
                      {category.product_count ?? "Unavailable"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className="mr-2 min-w-6 text-muted">
                          {index + 1}
                        </span>
                        <form action={moveCategory.bind(null, category.id, -1)}>
                          <button
                            type="submit"
                            disabled={index === 0}
                            aria-label={`Move ${category.name} earlier`}
                            title="Move earlier"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold-light hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ArrowUp aria-hidden size={16} />
                          </button>
                        </form>
                        <form action={moveCategory.bind(null, category.id, 1)}>
                          <button
                            type="submit"
                            disabled={index === categoriesWithCounts.length - 1}
                            aria-label={`Move ${category.name} later`}
                            title="Move later"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-gold-light hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ArrowDown aria-hidden size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {category.display_on_home !== false ? (
                        <span className="text-xs text-success">Yes</span>
                      ) : (
                        <span className="text-xs text-muted">No</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/categories/${category.id}`}
                          className="inline-flex min-h-11 items-center gap-1 px-3 text-xs text-muted transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                        >
                          <Pencil aria-hidden size={12} />
                          Edit
                        </Link>
                        <form action={deleteCategory.bind(null, category.id)}>
                          <button
                            type="submit"
                            className="inline-flex min-h-11 items-center gap-1 px-3 text-xs text-danger transition-colors hover:text-danger-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={deleteDisabled}
                            title={deleteTitle}
                          >
                            <Trash2 aria-hidden size={12} />
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="text-xs text-muted">
        <p>
          <strong>Note:</strong> Categories with products cannot be deleted.
          Reassign products to another category first.
        </p>
      </div>
    </div>
  );
}
