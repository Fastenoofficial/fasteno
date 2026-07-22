"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CheckoutForm,
  CheckoutSummary,
  type AppliedCoupon,
} from "@/components/checkout/CheckoutForm";
import { useCart } from "@/lib/cart-context";

/** Client island for /checkout — swaps in an empty state when there is
 *  nothing to buy, otherwise renders form + summary side by side.
 *  Owns the applied-coupon state so the summary (input + discount line)
 *  and the form (code submitted with the order) stay in sync. */
export function CheckoutClient() {
  const { hydrated, items } = useCart();
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  if (hydrated && items.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState
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
