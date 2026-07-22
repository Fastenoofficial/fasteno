"use client";

import { useActionState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate, formatINR } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { trackOrder, type TrackOrderState } from "./actions";

const initialState: TrackOrderState = { order: null, error: null };

const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Order placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const PAYMENT_TONE: Record<
  PaymentStatus,
  "success" | "gold" | "danger" | "muted"
> = {
  paid: "success",
  pending: "gold",
  failed: "danger",
  refunded: "muted",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Payment received",
  pending: "Payment pending",
  failed: "Payment failed",
  refunded: "Refunded",
};

export function TrackOrderForm() {
  const [state, formAction, pending] = useActionState(
    trackOrder,
    initialState,
  );
  const order = state.order;
  const cancelled = order?.status === "cancelled";
  const reachedIndex = order
    ? TIMELINE.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <div>
      <form
        action={formAction}
        className="grid gap-4 border border-line bg-card p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <Input
          label="Order number"
          name="orderNumber"
          placeholder="FS-10023"
          autoComplete="off"
          required
        />
        <Input
          label="Email used at checkout"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Button type="submit" disabled={pending} className="sm:mb-0">
          <Search size={16} aria-hidden />
          {pending ? "Searching…" : "Track"}
        </Button>
      </form>

      {state.error && (
        <p
          role="alert"
          className="mt-6 border border-danger/40 bg-card px-5 py-4 text-sm leading-relaxed text-danger"
        >
          {state.error}
        </p>
      )}

      {order && (
        <div className="mt-8 border border-line">
          {/* header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
            <div>
              <p className="eyebrow">Order</p>
              <p className="font-display text-lg text-ivory">
                {order.orderNumber}
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>Placed {formatDate(order.createdAt)}</p>
              <p className="mt-0.5 text-ivory">{formatINR(order.total)}</p>
            </div>
          </div>

          {/* status timeline */}
          <div className="px-5 py-6">
            {cancelled ? (
              <Badge tone="danger">Cancelled</Badge>
            ) : (
              <ol className="grid gap-4 sm:grid-cols-4">
                {TIMELINE.map((step, i) => {
                  const reached = i <= reachedIndex;
                  return (
                    <li key={step.key} className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`h-2.5 w-2.5 shrink-0 ${
                          reached ? "bg-gold" : "bg-line"
                        }`}
                      />
                      <span
                        className={`text-xs uppercase tracking-[0.14em] ${
                          reached ? "text-ivory" : "text-muted"
                        }`}
                      >
                        {step.label}
                        {i === reachedIndex && (
                          <span className="ml-1.5 text-gold">●</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* payment + courier */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5 text-sm text-muted">
              <Badge tone={PAYMENT_TONE[order.paymentStatus]}>
                {PAYMENT_LABEL[order.paymentStatus]}
              </Badge>
              <span className="text-xs uppercase tracking-[0.14em]">
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : order.paymentMethod === "razorpay"
                    ? "Paid online"
                    : "Demo payment"}
              </span>
            </div>

            {(order.courier || order.awbNumber || order.trackingUrl) && (
              <div className="mt-4 border border-line bg-card px-4 py-3 text-sm text-muted">
                {order.courier && (
                  <p>
                    Courier: <span className="text-ivory">{order.courier}</span>
                  </p>
                )}
                {order.awbNumber && (
                  <p className="mt-1">
                    AWB / tracking number:{" "}
                    <span className="text-ivory">{order.awbNumber}</span>
                  </p>
                )}
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-gold transition-colors hover:text-gold-light"
                  >
                    Track with courier
                    <ExternalLink size={13} aria-hidden />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
