"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  submitOrderRequest,
  type OrderRequestType,
} from "@/components/account/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { OrderStatus } from "@/lib/types";

/** Per-order self-service island: Cancel (pending/confirmed, two-step
 *  confirm) and Return / Replace (delivered, reason required). Once a
 *  request exists for the order, only its status chip is shown. */

export type OrderRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "completed";

export interface OrderRequestInfo {
  type: OrderRequestType;
  status: OrderRequestStatus;
}

const TYPE_LABELS: Record<OrderRequestType, string> = {
  cancel: "Cancellation",
  return: "Return",
  replace: "Replacement",
};

const STATUS_TONES: Record<
  OrderRequestStatus,
  "gold" | "muted" | "success" | "danger"
> = {
  requested: "muted",
  approved: "gold",
  rejected: "danger",
  completed: "success",
};

const STATUS_HINTS: Record<OrderRequestStatus, string> = {
  requested: "Our team will review this request shortly.",
  approved:
    "Approved — we will be in touch to arrange the next steps.",
  rejected: "This request was declined. Contact support for details.",
  completed: "This request has been completed.",
};

const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Delivery is too slow",
  "Other",
];

export function OrderActions({
  orderId,
  status,
  request,
}: {
  orderId: string;
  status: OrderStatus;
  request: OrderRequestInfo | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | OrderRequestType>("idle");
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [otherText, setOtherText] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderRequestType | null>(null);
  const [pending, startTransition] = useTransition();

  // Existing request → status chip only (buttons stay hidden).
  if (request) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Badge tone={STATUS_TONES[request.status]}>
          {TYPE_LABELS[request.type]} · {request.status}
        </Badge>
        <span className="text-xs text-muted">
          {STATUS_HINTS[request.status]}
        </span>
      </div>
    );
  }

  // Optimistic note while router.refresh() catches up.
  if (done) {
    return (
      <p className="text-xs text-success">
        {done === "cancel"
          ? "Cancellation submitted — refunds (if paid) go back to the original payment method."
          : "Request submitted — our team will review it shortly."}
      </p>
    );
  }

  const canCancel = status === "pending" || status === "confirmed";
  const canReturn = status === "delivered";
  if (!canCancel && !canReturn) return null;

  function submit(type: OrderRequestType, reasonText: string) {
    setError(null);
    startTransition(async () => {
      const result = await submitOrderRequest({
        orderId,
        type,
        reason: reasonText,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDone(type);
      setMode("idle");
      router.refresh();
    });
  }

  // ── Cancel (two-step: open panel, then confirm) ─────────────────────
  if (canCancel) {
    if (mode !== "cancel") {
      return (
        <div className="space-y-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              setMode("cancel");
              setError(null);
            }}
          >
            Cancel order
          </Button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      );
    }
    return (
      <div className="max-w-md space-y-3">
        <Select
          label="Reason (optional)"
          options={CANCEL_REASONS.map((r) => ({ value: r, label: r }))}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          disabled={pending}
        />
        {cancelReason === "Other" && (
          <Input
            label="Tell us more"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="What went wrong?"
            maxLength={200}
            disabled={pending}
          />
        )}
        <p className="text-xs text-muted">
          If you have already paid, the amount is refunded to your original
          payment method. This cannot be undone.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() =>
              submit(
                "cancel",
                cancelReason === "Other" ? otherText.trim() : cancelReason,
              )
            }
          >
            {pending ? "Cancelling…" : "Confirm cancellation"}
          </Button>
          {!pending && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("idle")}
            >
              Keep order
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  // ── Return / Replace (delivered) ────────────────────────────────────
  if (mode !== "return" && mode !== "replace") {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMode("return");
              setError(null);
            }}
          >
            Return items
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setMode("replace");
              setError(null);
            }}
          >
            Request replacement
          </Button>
          <span className="text-xs text-muted">
            7-day window from delivery.
          </span>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  const isReturn = mode === "return";
  return (
    <div className="max-w-md space-y-3">
      <Textarea
        label={isReturn ? "Why are you returning it?" : "What needs replacing?"}
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={
          isReturn
            ? "e.g. Colour does not match the photos"
            : "e.g. The clasp arrived damaged"
        }
        maxLength={500}
        disabled={pending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!reason.trim()) {
              setError("Please tell us the reason for your request.");
              return;
            }
            submit(mode, reason.trim());
          }}
        >
          {pending
            ? "Submitting…"
            : isReturn
              ? "Submit return request"
              : "Submit replacement request"}
        </Button>
        {!pending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode("idle")}
          >
            Back
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
