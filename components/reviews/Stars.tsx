/** Inline SVG star row — sharp five-point stars per the Modern Heritage
 *  aesthetic. Server-safe (no hooks), also fine inside client islands.
 *  Fractional ratings (e.g. 4.3) render via a pixel-clipped gold overlay. */

/** Sharp five-point star polygon on a 24×24 viewBox (shared with the
 *  interactive picker in ReviewForm). */
export const STAR_POINTS =
  "12,1.8 15.14,8.16 22.2,9.19 17.1,14.14 18.3,21.16 12,17.85 5.7,21.16 6.9,14.14 1.8,9.19 8.86,8.16";

const GAP = 2; // px between stars — kept in style so the overlay math is exact

function StarGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <polygon points={STAR_POINTS} fill="currentColor" />
    </svg>
  );
}

interface StarsProps {
  /** 0–5, fractions allowed (averages). */
  rating: number;
  /** Star size in px. */
  size?: number;
  className?: string;
}

export function Stars({ rating, size = 16, className = "" }: StarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const whole = Math.floor(clamped);
  const fraction = clamped - whole;
  // exact clip width: full stars incl. gaps + the fractional slice
  const clipWidth = whole * (size + GAP) + fraction * size;

  return (
    <span
      role="img"
      aria-label={`Rated ${clamped} out of 5 stars`}
      className={`relative inline-flex ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex text-line"
        style={{ columnGap: GAP }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <StarGlyph key={n} size={size} />
        ))}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 flex overflow-hidden text-gold-light"
        style={{ columnGap: GAP, width: clipWidth }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <StarGlyph key={n} size={size} />
        ))}
      </span>
    </span>
  );
}
