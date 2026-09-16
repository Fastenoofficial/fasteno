import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { createCategory } from "@/components/admin/category-actions";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "New Category",
};

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">New Category</h2>
        <p className="mt-1 text-sm text-muted">
          Create a new product category for organizing your catalog.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <CategoryForm action={createCategory} submitLabel="Create Category" />
    </div>
  );
}
