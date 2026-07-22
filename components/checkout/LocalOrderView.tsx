"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderView } from "@/components/checkout/OrderView";
import { findLocalOrder } from "@/components/checkout/local-orders";
import { isDemoMode, SUPPORT_EMAIL } from "@/lib/config";
import type { Order } from "@/lib/types";

/** Client fallback for /order/[id] — reads the fs-orders localStorage cache.
 *  Demo mode: the only order store. Live mode: covers guest orders that RLS
 *  hides from anonymous Supabase reads. */
export function LocalOrderView({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setOrder(findLocalOrder(id));
    setChecked(true);
  }, [id]);

  if (!checked) {
    return (
      <div className="py-24 text-center text-sm text-muted">
        Looking up your order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mt-10">
        <EmptyState
          icon={<PackageSearch size={36} strokeWidth={1.25} />}
          title="Order not found"
          description={
            isDemoMode
              ? "Demo orders live only in the browser they were placed in — this order isn't in this browser's history."
              : `We couldn't find this order on this device. If you have an account, check your order history — or write to ${SUPPORT_EMAIL}.`
          }
          actionLabel="Back to the Collection"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <>
      <ConfirmationHeader orderNumber={order.orderNumber} email={order.email} />
      {isDemoMode && (
        <p className="mb-8 border border-gold/50 bg-surface px-5 py-3 text-xs leading-relaxed text-muted">
          <span className="font-medium text-gold">Demo order</span> — payment
          was simulated and this order is stored only in your browser.
        </p>
      )}
      <OrderView order={order} />
      <ConfirmationFooter />
    </>
  );
}

export function ConfirmationHeader({
  orderNumber,
  email,
}: {
  orderNumber: string;
  email: string;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3">
        <CheckCircle2 size={28} className="shrink-0 text-success" />
        <p className="eyebrow">Order confirmed</p>
      </div>
      <h1 className="mt-3 font-display text-4xl text-ivory">
        Thank you. Order {orderNumber} is in hand.
      </h1>
      <div className="gold-rule mt-4" />
      <p className="mt-4 text-sm text-muted">
        A confirmation has been recorded for <span className="text-ivory">{email}</span>.
        We&apos;ll take it from here.
      </p>
    </div>
  );
}

export function ConfirmationFooter() {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      <Button href="/shop" variant="outline" size="md">
        Continue Shopping
      </Button>
      <Link
        href="/"
        className="text-sm text-muted transition-colors hover:text-gold"
      >
        Back to home
      </Link>
    </div>
  );
}
