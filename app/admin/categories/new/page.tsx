import type { Metadata } from "next";
import { Grid } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { createCategory } from "@/components/admin/category-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "New Category",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <form action={createCategory} className="space-y-6">
        <div className="space-y-6 border border-line bg-card p-6">
          <Input
            label="Category Name"
            name="name"
            placeholder="e.g., Ties, Cufflinks, Brooches"
            required
            
          />

          <Input
            label="Slug"
            name="slug"
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
              className="w-full rounded border border-line bg-surface px-4 py-3 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
              placeholder="Brief description of this category"
            />
          </div>

          <Input
            label="Sort Order"
            name="sort_order"
            type="number"
            defaultValue="0"
            min="0"
            
          />

          <div className="space-y-2">
            <label htmlFor="image_url" className="block text-sm font-medium text-ivory">
              Image URL (optional)
            </label>
            <div className="flex gap-2">
              <input
                id="image_url"
                name="image_url"
                type="text"
                placeholder="https://..."
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

          <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory">
            <input
              type="checkbox"
              name="display_on_home"
              defaultChecked
              className="h-4 w-4 cursor-pointer accent-block"
            />
            Display on home page
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="md">
            Create Category
          </Button>
          <Button href="/admin/categories" variant="outline" size="md">
            Cancel
          </Button>
        </div>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelector('input[name="name"]')?.addEventListener('input', function(e) {
              const slugInput = document.querySelector('input[name="slug"]');
              if (slugInput && !slugInput.value) {
                slugInput.value = e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/[^\\w\\s-]/g, '')
                  .replace(/[\\s_-]+/g, '-')
                  .replace(/^-+|-+$/g, '');
              }
            });

            // Image upload handler
            document.querySelector('input[type="file"][data-upload-target]')?.addEventListener('change', async function(e) {
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
          `,
        }}
      />
    </div>
  );
}
