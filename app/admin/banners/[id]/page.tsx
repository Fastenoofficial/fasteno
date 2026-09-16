import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerForm } from "@/components/admin/BannerForm";
import { updateBanner } from "@/components/admin/banner-actions";
import { requireAdmin } from "@/lib/auth";
import {
  isBannerLocation,
  type BannerProductOption,
  type SiteBannerRow,
} from "@/lib/banner-types";
import { isDemoMode } from "@/lib/config";
import { normalizeImageSource } from "@/lib/image-security";

export const metadata: Metadata = {
  title: "Edit Banner",
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

export default async function EditBannerPage({
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

  const [bannerResult, productsResult] = await Promise.all([
    supabase
      .from("site_banners")
      .select(
        "id, location, title, subtitle, cta_text, cta_link, image_url, mobile_image_url, enabled, sort_order, product_1_id, product_2_id, starts_at, ends_at, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, name, slug, price, images, active")
      .order("name", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (
    bannerResult.error ||
    !bannerResult.data ||
    !isBannerLocation(bannerResult.data.location)
  ) {
    notFound();
  }

  const banner = bannerResult.data as unknown as SiteBannerRow;
  const selectedIds = new Set(
    [banner.product_1_id, banner.product_2_id].filter(
      (productId): productId is string => Boolean(productId),
    ),
  );
  const productOptions = (
    (productsResult.data ?? []) as ProductOptionRow[]
  )
    .filter((product) => product.active || selectedIds.has(product.id))
    .map(mapProductOption);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Edit Hero Slide</h2>
        <p className="mt-1 text-sm text-muted">
          Update carousel content, products, schedule, media, and order.
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
      {productsResult.error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          Product options could not be refreshed. Saving is disabled so existing selections cannot be changed or erased.
        </p>
      )}

      <BannerForm
        action={updateBanner.bind(null, id)}
        productOptions={productOptions}
        productOptionsUnavailable={Boolean(productsResult.error)}
        initialBanner={banner}
        submitLabel="Save Changes"
      />
    </div>
  );
}
