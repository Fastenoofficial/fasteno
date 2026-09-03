import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { updateBanner } from "@/components/admin/banner-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "Edit Banner",
};

interface Banner {
  id: string;
  location: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  mobile_image_url: string | null;
  enabled: boolean;
  sort_order: number;
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

  const { data } = await supabase
    .from("site_banners")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const banner = data as Banner;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Edit Banner</h2>
        <p className="mt-1 text-sm text-muted">
          Update banner details and images.
        </p>
      </div>

      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <form action={updateBanner.bind(null, id)} className="space-y-6">
        <div className="space-y-6 border border-line bg-card p-6">
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium text-ivory">
              Location <span className="text-danger">*</span>
            </label>
            <select
              id="location"
              name="location"
              required
              defaultValue={banner.location}
              className="w-full rounded border border-line bg-surface px-4 py-3 text-sm text-ivory focus:border-gold focus:outline-none"
            >
              <option value="home-hero">Home Hero</option>
              <option value="category-header">Category Header</option>
              <option value="promo-bar">Promo Bar</option>
            </select>
            <p className="text-xs text-muted">Where this banner will be displayed</p>
          </div>

          <Input
            label="Title"
            name="title"
            defaultValue={banner.title}
            placeholder="e.g., Elevate your formal attire"
            
          />

          <div className="space-y-2">
            <label htmlFor="subtitle" className="block text-sm font-medium text-ivory">
              Subtitle
            </label>
            <textarea
              id="subtitle"
              name="subtitle"
              rows={2}
              defaultValue={banner.subtitle}
              className="w-full rounded border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Supporting text or description"
            />
          </div>

          <Input
            label="CTA Button Text"
            name="cta_text"
            defaultValue={banner.cta_text}
            placeholder="e.g., Shop Now"
            
          />

          <Input
            label="CTA Link"
            name="cta_link"
            defaultValue={banner.cta_link}
            placeholder="/shop"
            
          />

          <Input
            label="Desktop Image URL"
            name="image_url"
            defaultValue={banner.image_url}
            placeholder="https://..."
            required
            
          />

          {banner.image_url && (
            <div className="space-y-2">
              <p className="text-xs text-muted">Current desktop image:</p>
              <img
                src={banner.image_url}
                alt="Desktop preview"
                className="max-h-48 rounded border border-line object-cover"
              />
            </div>
          )}

          <Input
            label="Mobile Image URL (optional)"
            name="mobile_image_url"
            defaultValue={banner.mobile_image_url || ""}
            placeholder="https://..."
            
          />

          {banner.mobile_image_url && (
            <div className="space-y-2">
              <p className="text-xs text-muted">Current mobile image:</p>
              <img
                src={banner.mobile_image_url}
                alt="Mobile preview"
                className="max-h-48 rounded border border-line object-cover"
              />
            </div>
          )}

          <Input
            label="Sort Order"
            name="sort_order"
            type="number"
            defaultValue={String(banner.sort_order)}
            min="0"
            
          />

          <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={banner.enabled}
              className="h-4 w-4 cursor-pointer accent-block"
            />
            Enable this banner
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="md">
            Save Changes
          </Button>
          <Button href="/admin/banners" variant="outline" size="md">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
