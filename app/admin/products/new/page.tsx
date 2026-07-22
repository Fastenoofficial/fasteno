import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata: Metadata = {
  title: "New Product",
};

export default async function AdminNewProductPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">New Product</h2>
        <p className="mt-1 text-sm text-muted">
          Prices are entered in rupees and stored as paise.
        </p>
      </div>
      <ProductForm categorySlugs={categories.map((c) => c.slug)} />
    </div>
  );
}
