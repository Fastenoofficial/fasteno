import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { updateCategory } from "@/components/admin/category-actions";
import {
  CategoryForm,
  type CategoryFormValues,
} from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "Edit Category",
};

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  display_on_home: boolean | null;
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

  const { data, error: loadError } = await supabase
    .from("categories")
    .select(
      "id, slug, name, description, display_on_home, image_url",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("category page: load failed —", loadError.message);
  }
  if (!data && !loadError) notFound();

  const category = data as CategoryRow | null;
  const initialCategory: CategoryFormValues | undefined = category
    ? {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        display_on_home: category.display_on_home !== false,
        image_url: category.image_url,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Edit Category</h2>
        <p className="mt-1 text-sm text-muted">
          Update category details and settings.
        </p>
      </div>

      {(error || loadError) && (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error ?? "Unable to load this category. Please refresh and try again."}
        </p>
      )}

      {initialCategory && (
        <CategoryForm
          action={updateCategory.bind(null, id)}
          initialCategory={initialCategory}
          submitLabel="Save Changes"
        />
      )}
    </div>
  );
}
