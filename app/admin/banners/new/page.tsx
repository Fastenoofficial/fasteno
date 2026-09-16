import type { Metadata } from "next";
import { BannerForm } from "@/components/admin/BannerForm";
import { createBanner } from "@/components/admin/banner-actions";
import { requireAdmin } from "@/lib/auth";
import type { BannerProductOption } from "@/lib/banner-types";
import { isDemoMode } from "@/lib/config";
import { normalizeImageSource } from "@/lib/image-security";

export const metadata: Metadata = {
  title: "New Banner",
};

interface ProductOptionRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  active: boolean;
}

function mapProductOption(product: ProductOptionRow): BannerProductOption {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    image: product.images?.[0]
      ? normalizeImageSource(product.images[0])
      : null,
    active: product.active,
  };
}

export default async function NewBannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();
  const { error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error: productsError } = await supabase
    .from("products")
    .select("id, name, slug, price, images, active")
    .eq("active", true)
    .order("name", { ascending: true })
    .order("id", { ascending: true });
  const productOptions = ((data ?? []) as ProductOptionRow[]).map(
    mapProductOption,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">New Home Hero Slide</h2>
        <p className="mt-1 text-sm text-muted">
          Add one ordered, optionally scheduled slide to the home hero carousel.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {productsError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          Product options could not be loaded. You can still create a slide without product callouts.
        </p>
      )}

      <BannerForm
        action={createBanner}
        productOptions={productOptions}
        submitLabel="Create Slide"
      />
    </div>
  );
}
