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

          <div className="space-y-2">
            <label htmlFor="image_url" className="block text-sm font-medium text-ivory">
              Desktop Image URL <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="image_url"
                name="image_url"
                type="text"
                placeholder="https://..."
                required
                className="flex-1 rounded border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-surface px-4 py-3 text-sm text-ivory hover:border-gold">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-upload-target="image_url"
                />
                Upload
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="mobile_image_url" className="block text-sm font-medium text-ivory">
              Mobile Image URL (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="mobile_image_url"
                name="mobile_image_url"
                type="text"
                placeholder="https://..."
                className="flex-1 rounded border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-surface px-4 py-3 text-sm text-ivory hover:border-gold">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-upload-target="mobile_image_url"
                />
                Upload
              </label>
            </div>
          </div>

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

      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Image upload handler for all upload buttons
            document.querySelectorAll('input[type="file"][data-upload-target]').forEach(input => {
              input.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;

                const targetInput = document.getElementById(e.target.dataset.uploadTarget);
                if (!targetInput) return;

                const formData = new FormData();
                formData.append('file', file);

                try {
                  const btn = e.target.parentElement;
                  btn.style.opacity = '0.5';
                  btn.style.pointerEvents = 'none';
                  btn.textContent = 'Uploading...';

                  const response = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: formData
                  });

                  if (!response.ok) throw new Error('Upload failed');

                  const data = await response.json();
                  targetInput.value = data.url;
                  btn.textContent = 'Upload';
                  btn.style.opacity = '1';
                  btn.style.pointerEvents = 'auto';
                } catch (error) {
                  alert('Upload failed: ' + error.message);
                  const btn = e.target.parentElement;
                  btn.textContent = 'Upload';
                  btn.style.opacity = '1';
                  btn.style.pointerEvents = 'auto';
                }
              });
            });
          `,
        }}
      />
    </div>
  );
}
