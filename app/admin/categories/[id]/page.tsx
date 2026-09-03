import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { updateCategory } from "@/components/admin/category-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "Edit Category",
};

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  display_on_home: boolean;
  image_url: string | null;
}

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { id } = await params;
  const { error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const category = data as Category;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Edit Category</h2>
        <p className="mt-1 text-sm text-muted">
          Update category details and settings.
        </p>
      </div>

      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <form action={updateCategory.bind(null, id)} className="space-y-6">
        <div className="space-y-6 border border-line bg-card p-6">
          <Input
            label="Category Name"
            name="name"
            defaultValue={category.name}
            placeholder="e.g., Ties, Cufflinks, Brooches"
            required
            
          />

          <Input
            label="Slug"
            name="slug"
            defaultValue={category.slug}
            placeholder="e.g., ties, cufflinks, brooches"
            required
            pattern="[a-z0-9-]+"
            
          />

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-ivory">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={category.description}
              className="w-full rounded border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Brief description of this category"
            />
          </div>

          <Input
            label="Sort Order"
            name="sort_order"
            type="number"
            defaultValue={String(category.sort_order)}
            min="0"
            
          />

          <Input
            label="Image URL (optional)"
            name="image_url"
            defaultValue={category.image_url || ""}
            placeholder="https://..."
            
          />

          {category.image_url && (
            <div className="space-y-2">
              <p className="text-xs text-muted">Current image preview:</p>
              <img
                src={category.image_url}
                alt={category.name}
                className="h-32 w-32 rounded border border-line object-cover"
              />
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory">
            <input
              type="checkbox"
              name="display_on_home"
              defaultChecked={category.display_on_home}
              className="h-4 w-4 cursor-pointer accent-block"
            />
            Display on home page
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="md">
            Save Changes
          </Button>
          <Button href="/admin/categories" variant="outline" size="md">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
