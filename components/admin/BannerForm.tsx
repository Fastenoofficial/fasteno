"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import {
  BANNER_FIELD_LIMITS,
  HERO_BANNER_LOCATION,
  formatIsoAsIstDateTimeLocal,
  parseIstDateTimeLocal,
  type BannerProductCallout,
  type BannerProductOption,
  type HeroCarouselSlide,
  type SiteBannerRow,
} from "@/lib/banner-types";

interface BannerFormProps {
  action: (formData: FormData) => void | Promise<void>;
  productOptions: BannerProductOption[];
  productOptionsUnavailable?: boolean;
  initialBanner?: SiteBannerRow;
  submitLabel: string;
}

function previewableImage(value: string): boolean {
  const source = value.trim();
  return (
    (source.startsWith("/") && !source.startsWith("//")) ||
    /^https:\/\//i.test(source)
  );
}

export function BannerForm({
  action,
  productOptions,
  productOptionsUnavailable = false,
  initialBanner,
  submitLabel,
}: BannerFormProps) {
  const [title, setTitle] = useState(initialBanner?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialBanner?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(initialBanner?.cta_text ?? "");
  const [ctaLink, setCtaLink] = useState(initialBanner?.cta_link ?? "");
  const [desktopImage, setDesktopImage] = useState(
    initialBanner?.image_url ?? "",
  );
  const [mobileImage, setMobileImage] = useState(
    initialBanner?.mobile_image_url ?? "",
  );
  const [product1Id, setProduct1Id] = useState(
    initialBanner?.product_1_id ?? "",
  );
  const [product2Id, setProduct2Id] = useState(
    initialBanner?.product_2_id ?? "",
  );
  const [startsAt, setStartsAt] = useState(
    formatIsoAsIstDateTimeLocal(initialBanner?.starts_at ?? null),
  );
  const [endsAt, setEndsAt] = useState(
    formatIsoAsIstDateTimeLocal(initialBanner?.ends_at ?? null),
  );
  const [enabled, setEnabled] = useState(
    initialBanner ? initialBanner.enabled === true : true,
  );
  const [sortOrder, setSortOrder] = useState(
    String(initialBanner?.sort_order ?? 0),
  );
  const [desktopUploading, setDesktopUploading] = useState(false);
  const [mobileUploading, setMobileUploading] = useState(false);

  const location = initialBanner?.location ?? HERO_BANNER_LOCATION;
  const unsupportedPlacement = location !== HERO_BANNER_LOCATION;
  const duplicateProducts = Boolean(
    product1Id && product2Id && product1Id === product2Id,
  );
  const ctaPairIncomplete = Boolean(ctaText.trim()) !== Boolean(ctaLink.trim());

  let scheduleError = "";
  const parsedStart = startsAt ? parseIstDateTimeLocal(startsAt) : null;
  const parsedEnd = endsAt ? parseIstDateTimeLocal(endsAt) : null;
  if (startsAt && !parsedStart) {
    scheduleError = "Enter a valid start date and time in IST.";
  } else if (endsAt && !parsedEnd) {
    scheduleError = "Enter a valid end date and time in IST.";
  } else if (
    parsedStart &&
    parsedEnd &&
    new Date(parsedEnd).getTime() <= new Date(parsedStart).getTime()
  ) {
    scheduleError = "End time must be later than start time.";
  }

  const productById = useMemo(
    () => new Map(productOptions.map((product) => [product.id, product])),
    [productOptions],
  );

  function calloutFor(
    slot: 1 | 2,
    productId: string,
  ): BannerProductCallout | null {
    const product = productById.get(productId);
    if (!product) return null;
    return {
      slot,
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.image,
    };
  }

  const previewSlide = useMemo<HeroCarouselSlide | null>(() => {
    if (!previewableImage(desktopImage)) return null;
    const productCallouts = [
      calloutFor(1, product1Id),
      calloutFor(2, product2Id),
    ].filter((product): product is BannerProductCallout => product !== null);
    return {
      id: initialBanner?.id ?? "new-banner-preview",
      source: "cms",
      eyebrow: null,
      title: title.trim(),
      subtitle: subtitle.trim(),
      cta:
        ctaText.trim() && ctaLink.trim()
          ? { text: ctaText.trim(), href: ctaLink.trim() }
          : null,
      desktopImage: desktopImage.trim(),
      mobileImage: previewableImage(mobileImage)
        ? mobileImage.trim()
        : null,
      imageAlt: title.trim() || "Hero banner preview",
      accentImage: null,
      accentLabel: null,
      productCallouts,
    };
  }, [
    ctaLink,
    ctaText,
    desktopImage,
    initialBanner?.id,
    mobileImage,
    product1Id,
    product2Id,
    productById,
    subtitle,
    title,
  ]);

  const formInvalid =
    !desktopImage.trim() ||
    duplicateProducts ||
    ctaPairIncomplete ||
    Boolean(scheduleError) ||
    productOptionsUnavailable ||
    desktopUploading ||
    mobileUploading;

  const productSelectOptions = [
    { id: "", label: "No product" },
    ...productOptions.map((product) => ({
      id: product.id,
      label: `${product.name}${product.active ? "" : " (Inactive — currently selected)"}`,
    })),
  ];
  if (productOptionsUnavailable) {
    for (const [slot, productId] of [
      ["primary", product1Id],
      ["secondary", product2Id],
    ] as const) {
      if (
        productId &&
        !productSelectOptions.some((option) => option.id === productId)
      ) {
        productSelectOptions.push({
          id: productId,
          label: `Existing ${slot} product (temporarily unavailable)`,
        });
      }
    }
  }

  return (
    <form action={action} className="space-y-8">
      <div className="space-y-7 rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-7">
        <section className="space-y-5" aria-labelledby="banner-content-heading">
          <div>
            <h3
              id="banner-content-heading"
              className="font-display text-xl text-ivory"
            >
              Hero content
            </h3>
            <p className="mt-1 text-xs text-muted">
              Home hero is the only storefront placement implemented in this release.
            </p>
          </div>

          <input type="hidden" name="location" value={location} />
          <label className="block">
            <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Placement
            </span>
            <select
              value={location}
              disabled
              aria-describedby="placement-help"
              className="w-full cursor-not-allowed rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted"
            >
              <option value="home-hero">Home Hero</option>
              {unsupportedPlacement && (
                <option value={location}>
                  {location} (unsupported storefront placement)
                </option>
              )}
            </select>
          </label>
          <p id="placement-help" className="text-xs text-muted">
            {unsupportedPlacement
              ? "This legacy placement is preserved on save, but it has no storefront renderer. Create new banners only for Home Hero."
              : "Displayed in the rotating carousel at the top of the home page."}
          </p>

          <Input
            id="banner-title"
            label="Title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={BANNER_FIELD_LIMITS.title}
            placeholder="e.g., Elevate your formal attire"
          />
          <Textarea
            id="banner-subtitle"
            label="Subtitle"
            name="subtitle"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
            maxLength={BANNER_FIELD_LIMITS.subtitle}
            rows={3}
            placeholder="Supporting text or description"
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              id="banner-cta-text"
              label="CTA button text"
              name="cta_text"
              value={ctaText}
              onChange={(event) => setCtaText(event.target.value)}
              maxLength={BANNER_FIELD_LIMITS.ctaText}
              placeholder="e.g., Shop Now"
              aria-describedby={ctaPairIncomplete ? "cta-pair-error" : undefined}
            />
            <Input
              id="banner-cta-link"
              label="CTA link"
              name="cta_link"
              value={ctaLink}
              onChange={(event) => setCtaLink(event.target.value)}
              maxLength={BANNER_FIELD_LIMITS.url}
              placeholder="/shop"
              aria-describedby={ctaPairIncomplete ? "cta-pair-error" : undefined}
            />
          </div>
          {ctaPairIncomplete && (
            <p id="cta-pair-error" role="alert" className="text-xs text-danger">
              CTA text and CTA link must either both be set or both be empty.
            </p>
          )}
        </section>

        <section className="space-y-6 border-t border-line pt-7" aria-labelledby="banner-media-heading">
          <div>
            <h3 id="banner-media-heading" className="font-display text-xl text-ivory">
              Hero media
            </h3>
            <p className="mt-1 text-xs text-muted">
              Uploaded files use the existing allowlisted admin image pipeline.
            </p>
          </div>
          <SingleImageUploader
            name="image_url"
            label="Desktop image"
            value={desktopImage}
            onChange={setDesktopImage}
            required
            slug="banners/desktop"
            onUploadingChange={setDesktopUploading}
            helpText="Required. JPEG, PNG, WebP or AVIF, up to 5 MB."
          />
          <SingleImageUploader
            name="mobile_image_url"
            label="Mobile image"
            value={mobileImage}
            onChange={setMobileImage}
            slug="banners/mobile"
            onUploadingChange={setMobileUploading}
            helpText="Optional. The desktop image is used as the mobile fallback."
          />
          {!desktopImage.trim() && (
            <p role="alert" className="text-xs text-danger">
              A desktop image is required.
            </p>
          )}
        </section>

        <section className="space-y-5 border-t border-line pt-7" aria-labelledby="banner-products-heading">
          <div>
            <h3 id="banner-products-heading" className="font-display text-xl text-ivory">
              Product callouts
            </h3>
            <p className="mt-1 text-xs text-muted">
              Optional active products render in primary then secondary slot order.
            </p>
          </div>
          {productOptionsUnavailable && (
            <>
              <input type="hidden" name="product_1_id" value={product1Id} />
              <input type="hidden" name="product_2_id" value={product2Id} />
              <p role="alert" className="text-xs text-danger">
                Product choices are temporarily unavailable. Existing selections are retained, and saving is disabled until the list reloads.
              </p>
            </>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                Primary product
              </span>
              <select
                name={productOptionsUnavailable ? undefined : "product_1_id"}
                disabled={productOptionsUnavailable}
                value={product1Id}
                onChange={(event) => setProduct1Id(event.target.value)}
                aria-describedby={duplicateProducts ? "duplicate-product-error" : undefined}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ivory shadow-sm focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20"
              >
                {productSelectOptions.map((option) => (
                  <option key={option.id || "none-primary"} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                Secondary product
              </span>
              <select
                name={productOptionsUnavailable ? undefined : "product_2_id"}
                disabled={productOptionsUnavailable}
                value={product2Id}
                onChange={(event) => setProduct2Id(event.target.value)}
                aria-describedby={duplicateProducts ? "duplicate-product-error" : undefined}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ivory shadow-sm focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20"
              >
                {productSelectOptions.map((option) => (
                  <option key={option.id || "none-secondary"} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {duplicateProducts && (
            <p id="duplicate-product-error" role="alert" className="text-xs text-danger">
              Choose two different products, or set one slot to “No product”.
            </p>
          )}
        </section>

        <section className="space-y-5 border-t border-line pt-7" aria-labelledby="banner-schedule-heading">
          <div>
            <h3 id="banner-schedule-heading" className="font-display text-xl text-ivory">
              Schedule and order
            </h3>
            <p className="mt-1 text-xs text-muted">
              Times are entered in India Standard Time (IST, UTC+05:30). Blank dates keep the banner unscheduled.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              id="banner-starts-at"
              label="Starts at (IST)"
              name="starts_at"
              type="datetime-local"
              step="60"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              aria-describedby={scheduleError ? "schedule-error" : undefined}
            />
            <Input
              id="banner-ends-at"
              label="Ends at (IST)"
              name="ends_at"
              type="datetime-local"
              step="60"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              aria-describedby={scheduleError ? "schedule-error" : undefined}
            />
          </div>
          {scheduleError && (
            <p id="schedule-error" role="alert" className="text-xs text-danger">
              {scheduleError}
            </p>
          )}
          <div className="grid items-end gap-5 md:grid-cols-2">
            <Input
              id="banner-sort-order"
              label="Sort order"
              name="sort_order"
              type="number"
              min={0}
              max={BANNER_FIELD_LIMITS.sortOrder}
              step={1}
              required
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 text-sm text-ivory">
              <input
                type="checkbox"
                name="enabled"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-5 w-5 cursor-pointer accent-block"
              />
              Enabled for its schedule window
            </label>
          </div>
        </section>
      </div>

      <section className="space-y-4" aria-labelledby="banner-preview-heading">
        <div>
          <h3 id="banner-preview-heading" className="font-display text-xl text-ivory">
            Live hero preview
          </h3>
          <p className="mt-1 text-xs text-muted">
            Composed with the real hero visual. The mobile preview falls back to the desktop image when no mobile image is set.
          </p>
        </div>
        {previewSlide ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="overflow-hidden rounded-2xl border border-line">
              <p className="border-b border-line bg-card px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Desktop
              </p>
              <HeroCarousel
                slides={[previewSlide]}
                previewMode="desktop"
                label="Desktop hero preview"
              />
            </div>
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-line">
              <p className="border-b border-line bg-card px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Mobile
              </p>
              <HeroCarousel
                slides={[previewSlide]}
                previewMode="mobile"
                label="Mobile hero preview"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-12 text-center text-sm text-muted">
            Add a valid desktop image path or HTTPS URL to compose the preview.
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" size="md" disabled={formInvalid}>
          {submitLabel}
        </Button>
        <Button href="/admin/banners" variant="outline" size="md">
          Cancel
        </Button>
      </div>
    </form>
  );
}
