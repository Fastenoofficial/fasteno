"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StorefrontImage } from "@/components/ui/StorefrontImage";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { FreeShippingProgress } from "@/components/checkout/FreeShippingProgress";
import { useCart } from "@/lib/cart-context";
import { trackStorefrontEvent } from "@/lib/analytics-client";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/config";
import { formatINR } from "@/lib/format";

/** Client island for /cart — the interactive cart body. The server page
 * passes the server-rendered delivery estimate for placement below totals. */
export function CartClient({
  deliveryEstimate,
}: {
  deliveryEstimate?: ReactNode;
}) {
  const { hydrated, items, count, subtotal, updateQuantity, removeItem } =
    useCart();
  const viewedCart = useRef(false);

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  useEffect(() => {
    if (!hydrated || items.length === 0 || viewedCart.current) return;
    viewedCart.current = true;
    trackStorefrontEvent({ type: "view_cart", items, value: subtotal });
  }, [hydrated, items, subtotal]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow">Your selection</p>
      <h1 className="mt-2 font-display text-4xl text-ivory">Shopping Cart</h1>
      <div className="gold-rule mt-4" />

      {!hydrated ? (
        <div
          role="status"
          aria-live="polite"
          className="py-24 text-center text-sm text-muted"
        >
          Loading your cart…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            headingLevel={2}
            icon={<ShoppingBag size={36} strokeWidth={1.25} />}
            title="Your cart is empty"
            description="The finishing touch is still waiting. Browse the collection to find it."
            actionLabel="Browse the Collection"
            actionHref="/shop"
          />
        </div>
      ) : (
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <div className="min-w-0">
            <FreeShippingProgress subtotal={subtotal} />

            <ul className="mt-6 overflow-hidden rounded-2xl border border-line-soft bg-card shadow-[var(--shadow-card)]">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-4 border-b border-line-soft p-4 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center sm:p-5"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line-soft bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <StorefrontImage
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="min-w-0 self-center">
                    <Link
                      href={`/product/${item.slug}`}
                      className="block break-words text-sm text-ivory transition-colors hover:text-gold"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {formatINR(item.price)} each
                    </p>
                  </div>

                  <div className="col-span-2 flex w-full min-w-0 items-center gap-3 sm:col-span-1 sm:w-auto sm:gap-4">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      onChange={(quantity) => {
                        trackStorefrontEvent({
                          type: "change_cart_quantity",
                          item,
                          previousQuantity: item.quantity,
                          nextQuantity: quantity,
                        });
                        updateQuantity(item.productId, quantity);
                      }}
                      label={`Quantity for ${item.name}`}
                    />
                    <span className="ml-auto min-w-0 flex-1 text-right font-display text-ivory sm:w-24 sm:flex-none">
                      {formatINR(item.price * item.quantity)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => {
                        trackStorefrontEvent({ type: "remove_from_cart", item });
                        removeItem(item.productId);
                      }}
                      className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Button href="/shop" variant="ghost" size="sm">
                ← Continue shopping
              </Button>
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-line-soft bg-card p-6 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
            <h2 className="font-display text-xl text-ivory">Order summary</h2>
            <div className="gold-rule mt-3" />
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">
                  Subtotal ({count} {count === 1 ? "item" : "items"})
                </dt>
                <dd className="text-ivory">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Estimated shipping</dt>
                <dd className={shippingFee === 0 ? "text-success" : "text-ivory"}>
                  {shippingFee === 0 ? "Free" : formatINR(shippingFee)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-4 text-base">
                <dt className="text-ivory">Total</dt>
                <dd className="font-display text-lg text-gold">
                  {formatINR(total)}
                </dd>
              </div>
            </dl>
            {deliveryEstimate && (
              <div className="mt-4 border-t border-line pt-4">
                {deliveryEstimate}
              </div>
            )}
            <div className="mt-6">
              <Button href="/checkout" size="lg" className="w-full">
                Proceed to Checkout
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Razorpay secure payments · Cash on Delivery available
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
