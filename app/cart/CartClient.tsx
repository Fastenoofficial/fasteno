"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { FreeShippingProgress } from "@/components/checkout/FreeShippingProgress";
import { useCart } from "@/lib/cart-context";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/config";
import { formatINR } from "@/lib/format";

/** Client island for /cart — the interactive cart body. The server page
 *  passes the (server-rendered) delivery estimate in as a node so it can
 *  sit under the totals. */
export function CartClient({
  deliveryEstimate,
}: {
  deliveryEstimate?: ReactNode;
}) {
  const { hydrated, items, count, subtotal, updateQuantity, removeItem } =
    useCart();

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <p className="eyebrow">Your selection</p>
      <h1 className="mt-2 font-display text-4xl text-ivory">Shopping Cart</h1>
      <div className="gold-rule mt-4" />

      {!hydrated ? (
        <div className="py-24 text-center text-sm text-muted">
          Loading your cart…
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<ShoppingBag size={36} strokeWidth={1.25} />}
            title="Your cart is empty"
            description="The finishing touch is still waiting. Browse the collection to find it."
            actionLabel="Browse the Collection"
            actionHref="/shop"
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* ── Line items ── */}
          <div>
            <FreeShippingProgress subtotal={subtotal} />

            <ul className="mt-6 border border-line">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex flex-col gap-4 border-b border-line p-5 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    className="h-24 w-24 shrink-0 overflow-hidden border border-line bg-card"
                  >
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      className="block truncate text-sm text-ivory transition-colors hover:text-gold"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {formatINR(item.price)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      onChange={(q) => updateQuantity(item.productId, q)}
                    />
                    <span className="w-24 text-right font-display text-ivory">
                      {formatINR(item.price * item.quantity)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      onClick={() => removeItem(item.productId)}
                      className="text-muted transition-colors hover:text-danger cursor-pointer"
                    >
                      <Trash2 size={16} />
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

          {/* ── Summary ── */}
          <aside className="h-fit border border-line bg-surface p-6">
            <h2 className="font-display text-xl text-ivory">Order summary</h2>
            <div className="gold-rule mt-3" />
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">
                  Subtotal ({count} {count === 1 ? "item" : "items"})
                </dt>
                <dd className="text-ivory">{formatINR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Estimated shipping</dt>
                <dd className={shippingFee === 0 ? "text-success" : "text-ivory"}>
                  {shippingFee === 0 ? "Free" : formatINR(shippingFee)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-4 text-base">
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
