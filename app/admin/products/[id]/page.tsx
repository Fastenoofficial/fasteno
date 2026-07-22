import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { getCategories, mapProductRow, type ProductRow } from "@/lib/catalog";
import { Badge } from "@/components/ui/Badge";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Edit Product",
};

/** Direct fetch by id — includes archived products (admin RLS allows it),
 *  which lib/catalog.ts intentionally filters out. */
async function getAdminProduct(
  id: string,
): Promise<(Product & { countryOfOrigin: string; hsnCode: string }) | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, description, details, material, color, pattern, tags, images, stock, featured, active, created_at, country_of_origin, hsn_code, meta_title, meta_description, category_slug:categories!inner(slug)",
    )
    .eq("id", id)
    .single();
  if (!data) return null;

  const row = data as unknown as Omit<ProductRow, "category_slug"> & {
    category_slug: { slug: string } | { slug: string }[];
    country_of_origin: string | null;
    hsn_code: string | null;
  };
  const cat = Array.isArray(row.category_slug)
    ? row.category_slug[0]?.slug
    : row.category_slug?.slug;
  return {
    ...mapProductRow({ ...row, category_slug: cat ?? "ties" }),
    countryOfOrigin: row.country_of_origin ?? "India",
    hsnCode: row.hsn_code ?? "",
  };
}

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl text-ivory">{product.name}</h2>
        {product.active ? (
          <Badge tone="success">Live</Badge>
        ) : (
          <Badge tone="muted">Archived</Badge>
        )}
      </div>
      <ProductForm
        product={product}
        categorySlugs={categories.map((c) => c.slug)}
      />
    </div>
  );
}
