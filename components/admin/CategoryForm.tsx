"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  display_on_home: boolean;
  image_url: string | null;
}

interface CategoryFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialCategory?: CategoryFormValues;
  submitLabel: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SubmitButton({
  label,
  uploading,
}: {
  label: string;
  uploading: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="md"
      disabled={uploading || pending}
      aria-disabled={uploading || pending}
    >
      {uploading ? "Uploading image…" : pending ? "Saving…" : label}
    </Button>
  );
}

export function CategoryForm({
  action,
  initialCategory,
  submitLabel,
}: CategoryFormProps) {
  const isEdit = Boolean(initialCategory);
  const [name, setName] = useState(initialCategory?.name ?? "");
  const [slug, setSlug] = useState(initialCategory?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [description, setDescription] = useState(
    initialCategory?.description ?? "",
  );
  const [displayOnHome, setDisplayOnHome] = useState(
    initialCategory?.display_on_home ?? true,
  );
  const [imageUrl, setImageUrl] = useState(initialCategory?.image_url ?? "");
  const [uploading, setUploading] = useState(false);

  function handleNameChange(nextName: string) {
    setName(nextName);
    if (!slugEdited) setSlug(slugify(nextName));
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-7 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
        <section className="space-y-5" aria-labelledby="category-details-heading">
          <div>
            <h3
              id="category-details-heading"
              className="font-display text-xl text-ivory"
            >
              Category details
            </h3>
            <p className="mt-1 text-xs text-muted">
              Names, descriptions and links keep their current storefront copy.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              id="category-name"
              label="Category Name"
              name="name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              maxLength={120}
              placeholder="e.g., Ties, Cufflinks, Brooches"
              required
            />
            <Input
              id="category-slug"
              label="Slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
              maxLength={120}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              aria-describedby="category-slug-help"
              placeholder="e.g., ties, cufflinks, brooches"
              required
            />
          </div>
          <p id="category-slug-help" className="text-xs text-muted">
            The slug follows the name until you edit it yourself; manual edits
            are never overwritten.
          </p>

          <Textarea
            id="category-description"
            label="Description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1_000}
            rows={3}
            placeholder="Brief description of this category"
          />
        </section>

        <section
          className="space-y-5 border-t border-line pt-7"
          aria-labelledby="category-media-heading"
        >
          <div>
            <h3
              id="category-media-heading"
              className="font-display text-xl text-ivory"
            >
              Category image
            </h3>
            <p className="mt-1 text-xs text-muted">
              This image takes precedence over the category’s built-in artwork.
            </p>
          </div>
          <SingleImageUploader
            name="image_url"
            label="Category image"
            value={imageUrl}
            onChange={setImageUrl}
            slug={`categories-${slug || "new"}`}
            onUploadingChange={setUploading}
            helpText="Optional. JPEG, PNG, WebP or AVIF, up to 5 MB; you can also use an approved URL or safe local path."
          />
        </section>

        <section
          className="space-y-5 border-t border-line pt-7"
          aria-labelledby="category-display-heading"
        >
          <div>
            <h3
              id="category-display-heading"
              className="font-display text-xl text-ivory"
            >
              Display and order
            </h3>
            <p className="mt-1 text-xs text-muted">
              Use the arrow controls on the category list to set the storefront
              order without conflicting position numbers.
            </p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 text-sm text-ivory sm:max-w-md">
            <input
              type="checkbox"
              name="display_on_home"
              checked={displayOnHome}
              onChange={(event) => setDisplayOnHome(event.target.checked)}
              className="h-5 w-5 cursor-pointer accent-block"
            />
            Display on home page
          </label>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <SubmitButton label={submitLabel} uploading={uploading} />
        <Button href="/admin/categories" variant="outline" size="md">
          Cancel
        </Button>
      </div>
    </form>
  );
}
