"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import {
  deleteProduct,
  saveProduct,
  type ProductFormInput,
} from "@/components/admin/actions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { titleCase } from "@/lib/format";
import type { Pattern, Product } from "@/lib/types";

const PATTERNS: Pattern[] = ["solid", "striped", "textured", "printed"];

/** Prices are edited in rupees; stored as integer paise. */
function paiseToRupeeString(paise: number | null): string {
  if (paise === null) return "";
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

function rupeeStringToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ProductFormProps {
  /** undefined = create mode. Extra compliance fields ride alongside the
   *  shared Product type (they only exist in the admin surface). */
  product?: Product & { countryOfOrigin?: string; hsnCode?: string };
  categorySlugs: string[];
}

export function ProductForm({ product, categorySlugs }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [categorySlug, setCategorySlug] = useState(
    product?.category ?? categorySlugs[0] ?? "",
  );
  const [priceRupees, setPriceRupees] = useState(
    product ? paiseToRupeeString(product.price) : "",
  );
  const [compareAtRupees, setCompareAtRupees] = useState(
    product ? paiseToRupeeString(product.compareAtPrice) : "",
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [details, setDetails] = useState(product?.details.join("\n") ?? "");
  const [material, setMaterial] = useState(product?.material ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [pattern, setPattern] = useState<Pattern>(product?.pattern ?? "solid");
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [countryOfOrigin, setCountryOfOrigin] = useState(
    product?.countryOfOrigin ?? "India",
  );
  const [hsnCode, setHsnCode] = useState(product?.hsnCode ?? "");
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    product?.metaDescription ?? "",
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const price = rupeeStringToPaise(priceRupees);
    if (price === null || price === 0) {
      setError("Please enter a valid price in rupees.");
      return;
    }
    const compareAtPrice = rupeeStringToPaise(compareAtRupees);

    if (images.length === 0) {
      setError("Add at least one product image.");
      return;
    }

    const input: ProductFormInput = {
      slug: slug.trim(),
      name: name.trim(),
      categorySlug,
      price,
      compareAtPrice,
      description,
      details: details.split("\n"),
      material,
      color,
      pattern,
      tags: tags.split(","),
      images,
      stock: Number.parseInt(stock, 10) || 0,
      featured,
      active,
      countryOfOrigin: countryOfOrigin.trim() || "India",
      hsnCode: hsnCode.trim(),
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
    };

    startTransition(async () => {
      const result = await saveProduct(input, product?.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (isEdit) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/products/${result.id}`);
      }
    });
  }

  function handleArchive() {
    if (!product) return;
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.error) setError(result.error);
      else router.push("/admin/products");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* essentials */}
      <div className="space-y-4 border border-line bg-card p-6">
        <h3 className="font-display text-lg text-ivory">Essentials</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Midnight Navy Silk Tie"
          />
          <Input
            label="Slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="midnight-navy-silk-tie"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Category"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            options={categorySlugs.map((s) => ({
              value: s,
              label: titleCase(s),
            }))}
          />
          <Input
            label="Price (₹)"
            required
            inputMode="decimal"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
            placeholder="1899"
          />
          <Input
            label="Compare-at price (₹, optional)"
            inputMode="decimal"
            value={compareAtRupees}
            onChange={(e) => setCompareAtRupees(e.target.value)}
            placeholder="2499"
          />
        </div>
        <Textarea
          label="Description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A deep navy woven from pure mulberry silk…"
        />
      </div>

      {/* attributes */}
      <div className="space-y-4 border border-line bg-card p-6">
        <h3 className="font-display text-lg text-ivory">Attributes</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Material"
            required
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="silk"
          />
          <Input
            label="Colour"
            required
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="navy"
          />
          <Select
            label="Pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as Pattern)}
            options={PATTERNS.map((p) => ({ value: p, label: titleCase(p) }))}
          />
        </div>
        <Textarea
          label="Details (one bullet per line)"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={"100% mulberry silk\nHandmade in India\n8 cm blade width"}
        />
        <Input
          label="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="wedding, office, gift"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Country of origin"
            value={countryOfOrigin}
            onChange={(e) => setCountryOfOrigin(e.target.value)}
            placeholder="India"
          />
          <div>
            <Input
              label="HSN code (optional)"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              placeholder="6215"
            />
            <p className="mt-1.5 text-xs text-muted">
              e.g. 6215 for ties — shown on GST invoices
            </p>
          </div>
        </div>
      </div>

      {/* media & inventory */}
      <div className="space-y-4 border border-line bg-card p-6">
        <h3 className="font-display text-lg text-ivory">Media & inventory</h3>
        <ImageUploader
          images={images}
          onChange={setImages}
          slug={slug.trim() || undefined}
        />
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <Input
            label="Stock"
            required
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="12"
          />
          <label className="flex cursor-pointer items-center gap-2.5 py-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-gold)]"
            />
            Featured on home page
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 py-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-gold)]"
            />
            Active (visible in store)
          </label>
        </div>
      </div>

      {/* SEO (collapsible) */}
      <details className="group border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 [&::-webkit-details-marker]:hidden">
          <span className="font-display text-lg text-ivory">SEO</span>
          <ChevronDown
            size={16}
            className="text-muted transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-4 px-6 pb-6">
          <div>
            <Input
              label="Meta title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder={name.trim() || "Midnight Navy Silk Tie"}
              maxLength={70}
            />
            <p className="mt-1.5 text-xs text-muted">
              Shown as the browser/search title — defaults to the product
              name when left empty.
            </p>
          </div>
          <div>
            <Textarea
              label="Meta description"
              rows={3}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="A deep navy tie woven from pure mulberry silk — free shipping over ₹1,499."
              maxLength={200}
            />
            <p className="mt-1.5 text-xs text-muted">
              The snippet under the title in search results — aim for
              under 160 characters.
            </p>
          </div>
        </div>
      </details>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending
            ? "Saving…"
            : isEdit
              ? "Save Changes"
              : "Create Product"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => router.push("/admin/products")}
          disabled={pending}
        >
          Back to Products
        </Button>
        {isEdit && active && (
          <Button
            type="button"
            variant="danger"
            size="md"
            className="ml-auto"
            onClick={handleArchive}
            disabled={pending}
          >
            Archive Product
          </Button>
        )}
        {saved && <span className="text-sm text-success">Product saved.</span>}
      </div>
    </form>
  );
}
