"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckoutSkeleton } from "@/components/ui/StorefrontSkeleton";
import {
  CheckoutForm,
  CheckoutSummary,
  type AppliedCoupon,
} from "@/components/checkout/CheckoutForm";
import { trackStorefrontEvent } from "@/lib/analytics-client";
import { useCart } from "@/lib/cart-context";

/** Client island for /checkout. The form stays inert until persisted cart
 * state is hydrated, preventing an empty pre-hydration checkout submission. */
export function CheckoutClient() {
  const { hydrated, items, subtotal } = useCart();
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const trackedCheckout = useRef(false);

  useEffect(() => {
    if (!hydrated || items.length === 0 || trackedCheckout.current) return;
    trackedCheckout.current = true;
    trackStorefrontEvent({
      type: "begin_checkout",
      items,
      value: subtotal,
    });
  }, [hydrated, items, subtotal]);

  if (!hydrated) return <CheckoutSkeleton />;

  if (items.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
          headingLevel={2}
          icon={<ShoppingBag size={36} strokeWidth={1.25} />}
          title="Nothing to check out"
          description="Your cart is empty. Add something worth wearing first."
          actionLabel="Browse the Collection"
          actionHref="/shop"
        />
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
      <CheckoutForm coupon={coupon} />
      <CheckoutSummary coupon={coupon} onCouponChange={setCoupon} />
    </div>
  );
}
