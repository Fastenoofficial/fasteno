"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitReview } from "@/components/reviews/actions";
import { STAR_POINTS } from "@/components/reviews/Stars";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

/** Client island: star picker + title + body, submitted via the
 *  submitReview server action. Reviews land as "pending" and appear on
 *  the PDP once approved in /admin/reviews. */

const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ productSlug }: { productSlug: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="border border-line bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Thank you
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your review has been submitted for moderation. It will appear here
          once our team approves it.
        </p>
      </div>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Please choose a star rating.");
      return;
    }
    startTransition(async () => {
      const result = await submitReview({ productSlug, rating, title, body });
      if (result.error) setError(result.error);
      else setSubmitted(true);
    });
  }

  const active = hovered || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <span
          id={`rating-label-${productSlug}`}
          className="mb-1.5 block text-xs uppercase tracking-widest text-muted"
        >
          Your rating
        </span>
        <div
          role="radiogroup"
          aria-labelledby={`rating-label-${productSlug}`}
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"} — ${RATING_LABELS[n - 1]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onFocus={() => setHovered(n)}
              onBlur={() => setHovered(0)}
              className={`cursor-pointer p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                n <= active
                  ? "text-gold-light"
                  : "text-line hover:text-gold-light"
              }`}
            >
              <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden="true">
                <polygon points={STAR_POINTS} fill="currentColor" />
              </svg>
            </button>
          ))}
          <span
            aria-hidden="true"
            className="ml-2 min-w-20 text-xs uppercase tracking-widest text-muted"
          >
            {active > 0 ? RATING_LABELS[active - 1] : ""}
          </span>
        </div>
      </div>

      <Input
        label="Title"
        type="text"
        name="title"
        required
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Sum it up in a line"
      />
      <Textarea
        label="Your review"
        name="body"
        required
        rows={4}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Fit, finish, the occasion you wore it for — what should others know?"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "Submitting…" : "Submit Review"}
      </Button>
    </form>
  );
}
