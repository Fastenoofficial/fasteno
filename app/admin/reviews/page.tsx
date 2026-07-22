import type { Metadata } from "next";
import { Star } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdminReviewCard,
  type AdminReview,
} from "@/components/reviews/AdminReviewCard";
import { mapReviewRow, type ReviewRow } from "@/components/reviews/data";

export const metadata: Metadata = {
  title: "Reviews",
};

/** Admin review moderation — pending first, then everything already
 *  moderated. Approve / reject / reply run through server actions
 *  (RLS "reviews_admin_update" enforces the role in the database). */

type AdminReviewRow = ReviewRow & {
  products: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function mapAdminRow(row: AdminReviewRow): AdminReview {
  const joined = Array.isArray(row.products)
    ? (row.products[0] ?? null)
    : row.products;
  const review = mapReviewRow(row);
  return {
    id: review.id,
    authorName: review.authorName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    verified: review.verified,
    status: review.status,
    adminReply: review.adminReply,
    createdAt: review.createdAt,
    productName: joined?.name ?? "Unknown product",
    productSlug: joined?.slug ?? "",
  };
}

export default async function AdminReviewsPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  // admin sees every status — RLS "reviews_public_read" allows it
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, product_id, user_id, author_name, rating, title, body, verified, status, admin_reply, created_at, products(name, slug)",
    )
    .order("created_at", { ascending: false });

  const reviews = ((data ?? []) as unknown as AdminReviewRow[]).map(
    mapAdminRow,
  );
  const pending = reviews.filter((r) => r.status === "pending");
  const moderated = reviews.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-2xl text-ivory">Reviews</h2>
        <p className="mt-1 text-sm text-muted">
          {pending.length} awaiting moderation · {reviews.length} total
        </p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star size={32} strokeWidth={1.5} />}
          title="No reviews yet"
          description="Customer reviews land here for moderation before they appear on product pages."
        />
      ) : (
        <>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Awaiting moderation
            </h3>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                All caught up — nothing pending.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {pending.map((review) => (
                  <AdminReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>

          {moderated.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Moderated
              </h3>
              <div className="mt-4 space-y-4">
                {moderated.map((review) => (
                  <AdminReviewCard key={review.id} review={review} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
