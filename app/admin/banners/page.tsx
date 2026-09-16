import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Pencil,
  Plus,
  Power,
} from "lucide-react";
import { BannerDeleteButton } from "@/components/admin/BannerDeleteButton";
import {
  moveBanner,
  toggleBanner,
} from "@/components/admin/banner-actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdmin } from "@/lib/auth";
import {
  BANNER_LOCATIONS,
  isBannerLocation,
  type BannerLocation,
  type SiteBannerRow,
} from "@/lib/banner-types";
import { isDemoMode } from "@/lib/config";
import { normalizeImageSource } from "@/lib/image-security";

export const metadata: Metadata = {
  title: "Banners",
};

const locationLabels: Record<BannerLocation, string> = {
  "home-hero": "Home Hero",
  "category-header": "Category Header",
  "promo-bar": "Promo Bar",
};

const istFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

interface ProductNameRow {
  id: string;
  name: string;
  active: boolean;
}

type StatusTone = "muted" | "gold" | "success" | "danger";

function bannerStatus(
  banner: SiteBannerRow,
  nowMs: number,
): { label: "Disabled" | "Scheduled" | "Active" | "Expired"; tone: StatusTone } {
  if (!banner.enabled) return { label: "Disabled", tone: "muted" };
  if (banner.starts_at && new Date(banner.starts_at).getTime() > nowMs) {
    return { label: "Scheduled", tone: "gold" };
  }
  if (banner.ends_at && new Date(banner.ends_at).getTime() <= nowMs) {
    return { label: "Expired", tone: "danger" };
  }
  return { label: "Active", tone: "success" };
}

function formatIst(value: string | null): string {
  if (!value) return "Open";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : `${istFormatter.format(date)} IST`;
}

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    moved?: string;
    error?: string;
  }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { created, updated, deleted, moved, error } = await searchParams;
  const nowMs = Date.now();
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const bannerResult = await supabase
    .from("site_banners")
    .select(
      "id, location, title, subtitle, cta_text, cta_link, image_url, mobile_image_url, enabled, sort_order, product_1_id, product_2_id, starts_at, ends_at, created_at",
    )
    .order("location", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  const banners = ((bannerResult.data ?? []) as unknown as SiteBannerRow[]).filter(
    (banner) => isBannerLocation(banner.location),
  );
  const selectedProductIds = Array.from(
    new Set(
      banners.flatMap((banner) =>
        [banner.product_1_id, banner.product_2_id].filter(
          (productId): productId is string => Boolean(productId),
        ),
      ),
    ),
  );
  const productResult =
    selectedProductIds.length > 0
      ? await supabase
          .from("products")
          .select("id, name, active")
          .in("id", selectedProductIds)
      : { data: [] as ProductNameRow[], error: null };
  const products = new Map(
    ((productResult.data ?? []) as ProductNameRow[]).map((product) => [
      product.id,
      product,
    ]),
  );

  const groups = BANNER_LOCATIONS.map((location) => ({
    location,
    banners: banners.filter((banner) => banner.location === location),
  })).filter((group) => group.banners.length > 0);
  const loadError = bannerResult.error
    ? "Banners could not be loaded. Confirm migration 007 is deployed and try again."
    : productResult.error
      ? "Some selected product names could not be loaded."
      : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Banners</h2>
          <p className="mt-1 text-sm text-muted">
            Manage ordered and scheduled home hero carousel slides.
          </p>
        </div>
        <Button href="/admin/banners/new" variant="primary" size="sm">
          <Plus aria-hidden size={14} />
          New Hero Slide
        </Button>
      </div>

      {(created || updated || deleted || moved) && (
        <p
          role="status"
          className="rounded-xl border border-success/50 bg-card px-4 py-3 text-sm text-success"
        >
          {created
            ? "Banner created successfully."
            : updated
              ? "Banner updated successfully."
              : deleted
                ? "Banner deleted successfully."
                : "Banner order updated successfully."}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {loadError && (
        <p
          role="alert"
          className="rounded-xl border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {loadError}
        </p>
      )}

      {!bannerResult.error && banners.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={32} strokeWidth={1.5} />}
          title="No banners yet"
          description="Create a slide for the home hero carousel."
          actionLabel="New Hero Slide"
          actionHref="/admin/banners/new"
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const supported = group.location === "home-hero";
            return (
              <section key={group.location} aria-labelledby={`group-${group.location}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3
                    id={`group-${group.location}`}
                    className="font-display text-xl text-ivory"
                  >
                    {locationLabels[group.location]}
                  </h3>
                  {!supported && <Badge tone="muted">Unsupported placement</Badge>}
                  <span className="text-xs text-muted">
                    {group.banners.length} {group.banners.length === 1 ? "banner" : "banners"}
                  </span>
                </div>
                {!supported && (
                  <p className="mb-3 text-xs text-muted">
                    Stored for compatibility only; this placement has no storefront renderer.
                  </p>
                )}

                <ol className="space-y-3">
                  {group.banners.map((banner, index) => {
                    const status = bannerStatus(banner, nowMs);
                    const image = normalizeImageSource(banner.image_url);
                    const product1 = banner.product_1_id
                      ? products.get(banner.product_1_id)
                      : null;
                    const product2 = banner.product_2_id
                      ? products.get(banner.product_2_id)
                      : null;
                    return (
                      <li
                        key={banner.id}
                        className="rounded-2xl border border-line bg-card p-4 shadow-sm transition-colors hover:bg-surface"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                          {image ? (
                            <img
                              src={image}
                              alt=""
                              className="h-28 w-full rounded-xl border border-line object-cover lg:w-44"
                            />
                          ) : (
                            <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface text-xs text-muted lg:w-44">
                              Image unavailable
                            </div>
                          )}

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium text-ivory">
                                    {banner.title || "Untitled Banner"}
                                  </h4>
                                  <Badge tone={status.tone}>{status.label}</Badge>
                                </div>
                                {banner.subtitle && (
                                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                                    {banner.subtitle}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs tabular-nums text-muted">
                                Position {index + 1} · stored order {banner.sort_order ?? "—"}
                              </span>
                            </div>

                            <dl className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                              <div>
                                <dt className="text-muted">Schedule</dt>
                                <dd className="mt-0.5 text-ivory">
                                  {formatIst(banner.starts_at)} → {formatIst(banner.ends_at)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-muted">Product callouts</dt>
                                <dd className="mt-0.5 text-ivory">
                                  {product1
                                    ? `1. ${product1.name}${product1.active ? "" : " (inactive)"}`
                                    : "1. No product"}
                                  <br />
                                  {product2
                                    ? `2. ${product2.name}${product2.active ? "" : " (inactive)"}`
                                    : "2. No product"}
                                </dd>
                              </div>
                              {banner.cta_text && (
                                <div className="sm:col-span-2">
                                  <dt className="text-muted">CTA</dt>
                                  <dd className="mt-0.5 break-all text-ivory">
                                    {banner.cta_text}
                                    {banner.cta_link ? ` → ${banner.cta_link}` : ""}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-end gap-1 border-t border-line pt-3">
                          <form action={moveBanner.bind(null, banner.id, -1)}>
                            <button
                              type="submit"
                              disabled={index === 0}
                              aria-label={`Move ${banner.title || "untitled banner"} earlier`}
                              className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ArrowUp aria-hidden size={16} />
                            </button>
                          </form>
                          <form action={moveBanner.bind(null, banner.id, 1)}>
                            <button
                              type="submit"
                              disabled={index === group.banners.length - 1}
                              aria-label={`Move ${banner.title || "untitled banner"} later`}
                              className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <ArrowDown aria-hidden size={16} />
                            </button>
                          </form>
                          <form action={toggleBanner.bind(null, banner.id, !Boolean(banner.enabled))}>
                            <button
                              type="submit"
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                              aria-label={`${banner.enabled ? "Disable" : "Enable"} ${banner.title || "untitled banner"}`}
                            >
                              <Power aria-hidden size={14} />
                              {banner.enabled ? "Disable" : "Enable"}
                            </button>
                          </form>
                          <Link
                            href={`/admin/banners/${banner.id}`}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-muted transition-colors hover:bg-surface hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
                          >
                            <Pencil aria-hidden size={14} />
                            Edit
                          </Link>
                          <BannerDeleteButton
                            id={banner.id}
                            title={banner.title ?? ""}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
