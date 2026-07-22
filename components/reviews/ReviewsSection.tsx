import { getCurrentUser } from "@/lib/auth";
import { SITE_NAME } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { Stars } from "@/components/reviews/Stars";
import {
  getProductReviews,
  type ProductRating,
  type Review,
} from "@/components/reviews/data";
import type { Product } from "@/lib/types";

/** PDP reviews section (server component). Approved reviews list + rating
 *  summary + the write-a-review affordance (client form island when the
 *  user is signed in and hasn't reviewed yet). */

export async function ReviewsSection({
  product,
  rating,
}: {
  product: Product;
  rating: ProductRating;
}) {
  const [reviews, user] = await Promise.all([
    getProductReviews(product.id),
    getCurrentUser(),
  ]);

  const own = user
    ? (reviews.find((r) => r.userId === user.id) ?? null)
    : null;
  const approved = reviews.filter((r) => r.status === "approved");

  return (
    <div id="reviews" className="mt-20 scroll-mt-24 border-t border-line pt-14">
      <SectionHeading
        eyebrow="From our customers"
        title="Reviews"
        description={
          rating.count === 0
            ? "No reviews yet — be the first to share your experience."
            : undefined
        }
      >
        {rating.count > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-display text-4xl text-ivory">
              {rating.average.toFixed(1)}
            </span>
            <div>
              <Stars rating={rating.average} size={16} />
              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
                Based on {rating.count} review{rating.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}
      </SectionHeading>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
        {/* approved reviews list */}
        <div>
          {approved.length === 0 ? (
            <div className="border border-dashed border-line px-6 py-12 text-center">
              <p className="text-sm text-muted">
                This piece hasn&apos;t been reviewed yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {approved.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          )}
        </div>

        {/* write-a-review rail */}
        <aside className="lg:border-l lg:border-line lg:pl-10">
          <h3 className="font-display text-xl text-ivory">
            Share your experience
          </h3>
          <div className="gold-rule mt-3" />
          <div className="mt-5">
            {own ? (
              <OwnReviewNote review={own} />
            ) : user ? (
              <ReviewForm productSlug={product.slug} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  Sign in to rate this piece and tell others how it wore.
                  Reviews are published after a quick moderation check.
                </p>
                <Button
                  href={`/login?next=${encodeURIComponent(`/product/${product.slug}`)}`}
                  variant="outline"
                  size="md"
                >
                  Sign in to Write a Review
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Status note shown to a signed-in user who already has a review. */
function OwnReviewNote({ review }: { review: Review }) {
  const copy: Record<Review["status"], { label: string; text: string }> = {
    pending: {
      label: "Awaiting moderation",
      text: "Your review has been submitted and is with our team. It will appear here once approved.",
    },
    approved: {
      label: "Published",
      text: "Thank you — your review is live in the list alongside.",
    },
    rejected: {
      label: "Not published",
      text: "Your review was not approved for publication. Write to us if you think that was a mistake.",
    },
  };
  const { label, text } = copy[review.status];

  return (
    <div className="border border-line bg-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Stars rating={review.rating} size={14} />
        <Badge tone={review.status === "rejected" ? "danger" : "gold"}>
          {label}
        </Badge>
      </div>
      {review.title && (
        <p className="mt-3 font-display text-lg text-ivory">{review.title}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Stars rating={review.rating} size={14} />
        {review.verified && <Badge tone="success">Verified purchase</Badge>}
      </div>
      {review.title && (
        <h3 className="mt-3 font-display text-lg text-ivory">
          {review.title}
        </h3>
      )}
      {review.body && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {review.body}
        </p>
      )}
      <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted">
        {review.authorName} · {formatDate(review.createdAt)}
      </p>
      {review.adminReply && (
        <div className="mt-4 max-w-2xl border-l-2 border-gold-light bg-surface px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
            {SITE_NAME} replied
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {review.adminReply}
          </p>
        </div>
      )}
    </li>
  );
}
