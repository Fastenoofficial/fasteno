"use client";

import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { formatINR } from "@/lib/format";

/** Progress bar towards free shipping. subtotal in paise. */
export function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100),
  );
  const progressText =
    remaining === 0
      ? "Free shipping unlocked"
      : `${formatINR(remaining)} remaining for free shipping`;

  return (
    <div className="rounded-2xl border border-line-soft bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <p className="text-sm text-muted">
        {remaining === 0 ? (
          <span className="text-success">
            Your order qualifies for free shipping.
          </span>
        ) : (
          <>
            Add <span className="font-medium text-gold">{formatINR(remaining)}</span>{" "}
            more to unlock <span className="text-ivory">free shipping</span>.
          </>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress towards free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={progressText}
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${remaining === 0 ? "bg-success" : "bg-gold"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
