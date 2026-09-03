import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { createBanner } from "@/components/admin/banner-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "New Banner",
};

export default async function NewBannerPage({
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
        <h2 className="font-display text-2xl text-ivory">New Banner</h2>
        <p className="mt-1 text-sm text-muted">
          Create a new hero image or promotional banner.
        </p>
      </div>

      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <form action={createBanner} className="space-y-6">
        <div className="space-y-6 border border-line bg-card p-6">
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium text-ivory">
              Location <span className="text-danger">*</span>
            </label>
            <select
              id="location"
              name="location"
              required
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
              className="w-full rounded border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Supporting text or description"
            />
          </div>

          <Input
            label="CTA Button Text"
            name="cta_text"
            placeholder="e.g., Shop Now"
            
          />

          <Input
            label="CTA Link"
            name="cta_link"
            placeholder="/shop"
            
          />

          <Input
            label="Desktop Image URL"
            name="image_url"
            placeholder="https://..."
            required
            
          />

          <Input
            label="Mobile Image URL (optional)"
            name="mobile_image_url"
            placeholder="https://..."
            
          />

          <Input
            label="Sort Order"
            name="sort_order"
            type="number"
            defaultValue="0"
            min="0"
            
          />

          <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked
              className="h-4 w-4 cursor-pointer accent-block"
            />
            Enable this banner
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="md">
            Create Banner
          </Button>
          <Button href="/admin/banners" variant="outline" size="md">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
