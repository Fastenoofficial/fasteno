"use client";

import { useState, useTransition } from "react";
import {
  updateOrderStatus,
  updatePaymentStatus,
} from "@/components/admin/actions";
import { Select } from "@/components/ui/Select";
import { titleCase } from "@/lib/format";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

/** Order-status Select — persists via server action on change. */
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleChange(next: OrderStatus) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-1.5">
      <Select
        label="Order status"
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        options={ORDER_STATUSES.map((s) => ({
          value: s,
          label: titleCase(s),
        }))}
      />
      {pending && <p className="text-xs text-muted">Updating…</p>}
      {saved && !pending && (
        <p className="text-xs text-success">Status updated.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Payment-status Select — e.g. mark a COD order paid on delivery. */
export function PaymentStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: PaymentStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleChange(next: PaymentStatus) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, next);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-1.5">
      <Select
        label="Payment status"
        value={status}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as PaymentStatus)}
        options={PAYMENT_STATUSES.map((s) => ({
          value: s,
          label: titleCase(s),
        }))}
      />
      {pending && <p className="text-xs text-muted">Updating…</p>}
      {saved && !pending && (
        <p className="text-xs text-success">Payment status updated.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
