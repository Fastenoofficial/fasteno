"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refundOrderPayment } from "@/components/admin/actions";
import { Button } from "@/components/ui/Button";

/** Two-step refund button for paid orders: first click arms it
 *  ("Confirm refund?"), second click calls the refund server action. */
export function RefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!armed) {
      setArmed(true);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await refundOrderPayment(orderId);
      if (result.error) {
        setError(result.error);
        setArmed(false);
        return;
      }
      setDone(true);
      setArmed(false);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="text-xs text-success">
        Refund processed — payment status is now refunded.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleClick}
          disabled={pending}
        >
          {pending
            ? "Refunding…"
            : armed
              ? "Confirm refund?"
              : "Refund payment"}
        </Button>
        {armed && !pending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setArmed(false)}
          >
            Cancel
          </Button>
        )}
      </div>
      {armed && !pending && (
        <p className="text-xs text-muted">
          Refunds the payment (Razorpay or COD bookkeeping) and restores
          stock. This cannot be undone.
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
