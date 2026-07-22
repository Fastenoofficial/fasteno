"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteCoupon,
  toggleCouponActive,
} from "@/components/admin/actions";

/** Row-level coupon controls: active toggle + delete (with confirm step). */
export function CouponRowActions({
  couponId,
  active,
}: {
  couponId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleCouponActive(couponId, !active);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteCoupon(couponId);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`cursor-pointer border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:pointer-events-none disabled:opacity-45 ${
          active
            ? "border-line text-muted hover:border-danger/50 hover:text-danger"
            : "border-gold/50 text-gold hover:bg-block hover:border-block hover:text-block-text"
        }`}
      >
        {active ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        onBlur={() => setConfirming(false)}
        disabled={pending}
        aria-label={confirming ? "Confirm delete coupon" : "Delete coupon"}
        className={`flex cursor-pointer items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:pointer-events-none disabled:opacity-45 ${
          confirming
            ? "border-danger bg-danger/10 text-danger"
            : "border-line text-muted hover:border-danger/50 hover:text-danger"
        }`}
      >
        <Trash2 size={11} />
        {confirming ? "Confirm?" : "Delete"}
      </button>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  );
}
