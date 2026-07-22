"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { moderateReview, replyToReview } from "@/components/reviews/actions";
import { Stars } from "@/components/reviews/Stars";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type { ReviewStatus } from "@/components/reviews/data";

/** Serialisable review shape passed down from app/admin/reviews/page.tsx. */
export interface AdminReview {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  status: ReviewStatus;
  adminReply: string | null;
  createdAt: string;
  productName: string;
  productSlug: string;
}

const STATUS_BADGE: Record<
  ReviewStatus,
  { tone: "gold" | "success" | "danger"; label: string }
> = {
  pending: { tone: "gold", label: "Pending" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
};

export function AdminReviewCard({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [reply, setReply] = useState(review.adminReply ?? "");
  const [showReply, setShowReply] = useState(Boolean(review.adminReply));
  const [replySaved, setReplySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function moderate(status: "approved" | "rejected") {
    setError(null);
    setReplySaved(false);
    startTransition(async () => {
      const result = await moderateReview(review.id, status);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function saveReply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setReplySaved(false);
    startTransition(async () => {
      const result = await replyToReview(review.id, reply);
      if (result.error) setError(result.error);
      else {
        setReplySaved(true);
        router.refresh();
      }
    });
  }

  const badge = STATUS_BADGE[review.status];

  return (
    <article className="border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/product/${review.productSlug}`}
            className="text-sm font-medium text-ivory transition-colors hover:text-gold"
          >
            {review.productName}
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
            {review.authorName} ·{" "}
            {new Date(review.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {review.verified && <Badge tone="success">Verified</Badge>}
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>

      <div className="mt-3">
        <Stars rating={review.rating} size={14} />
      </div>
      {review.title && (
        <h3 className="mt-2 font-display text-lg text-ivory">{review.title}</h3>
      )}
      {review.body && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          {review.body}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {review.status !== "approved" && (
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => moderate("approved")}
          >
            <Check size={13} /> Approve
          </Button>
        )}
        {review.status !== "rejected" && (
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() => moderate("rejected")}
          >
            <X size={13} /> Reject
          </Button>
        )}
        <button
          type="button"
          onClick={() => setShowReply((s) => !s)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-gold"
        >
          <MessageSquare size={13} />
          {showReply ? "Hide reply" : review.adminReply ? "Edit reply" : "Reply"}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
        {replySaved && !error && (
          <span className="text-xs text-success">Reply saved.</span>
        )}
      </div>

      {showReply && (
        <form onSubmit={saveReply} className="mt-4 space-y-3">
          <Textarea
            label="Public reply (shown on the product page)"
            rows={3}
            maxLength={1000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Thank you for your kind words…"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? "Saving…" : "Save Reply"}
            </Button>
            {review.adminReply && (
              <span className="text-xs text-muted">
                Clearing the text removes the reply.
              </span>
            )}
          </div>
        </form>
      )}
    </article>
  );
}
