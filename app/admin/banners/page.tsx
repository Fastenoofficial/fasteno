import type { Metadata } from "next";
import Link from "next/link";
import { Image as ImageIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteBanner, toggleBanner } from "@/components/admin/banner-actions";

export const metadata: Metadata = {
  title: "Banners",
};

interface BannerRow {
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

const locationLabels: Record<string, string> = {
  "home-hero": "Home Hero",
  "category-header": "Category Header",
  "promo-bar": "Promo Bar",
};

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const { created, updated, deleted, error } = await searchParams;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data } = await supabase
    .from("site_banners")
    .select("*")
    .order("location")
    .order("sort_order", { ascending: true });

  const banners = (data ?? []) as BannerRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Banners</h2>
          <p className="mt-1 text-sm text-muted">
            Manage hero images and promotional banners
          </p>
        </div>
        <Button href="/admin/banners/new" variant="primary" size="sm">
          <Plus size={14} />
          New Banner
        </Button>
      </div>

      {created && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Banner created successfully.
        </p>
      )}
      {updated && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Banner updated successfully.
        </p>
      )}
      {deleted && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Banner deleted successfully.
        </p>
      )}
      {error && (
        <p role="alert" className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {banners.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={32} strokeWidth={1.5} />}
          title="No banners yet"
          description="Create hero images and promotional banners for your site."
          actionLabel="New Banner"
          actionHref="/admin/banners/new"
        />
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="border border-line bg-card p-4 transition-colors hover:bg-surface"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <img
                  src={banner.image_url}
                  alt={banner.title || "Banner"}
                  className="h-24 w-40 rounded border border-line object-cover"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-ivory">
                          {banner.title || "Untitled Banner"}
                        </h3>
                        {banner.enabled ? (
                          <span className="inline-flex items-center rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted/20 px-2 py-0.5 text-xs text-muted">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {locationLabels[banner.location] || banner.location}
                        {banner.subtitle && ` · ${banner.subtitle}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/banners/${banner.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ivory"
                      >
                        <Pencil size={12} />
                        Edit
                      </Link>
                      <form action={deleteBanner.bind(null, banner.id)}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-danger transition-colors hover:text-danger-light"
                          onClick={(e) => {
                            if (!confirm("Delete this banner?")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                  {banner.cta_text && (
                    <p className="text-xs text-muted">
                      CTA: {banner.cta_text}
                      {banner.cta_link && ` → ${banner.cta_link}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
