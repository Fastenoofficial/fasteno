"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { trackStorefrontEvent } from "@/lib/analytics-client";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ShareButton } from "@/components/product/ShareButton";
import type { Product } from "@/lib/types";

/** Client island: PDP purchase controls — quantity, cart, wishlist and share. */
export function AddToCartPanel({ product }: { product: Product }) {
  const { addItem, isWishlisted, toggleWishlist, hydrated } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const announcementSequence = useRef(0);
  const [announcement, setAnnouncement] = useState<{
    id: number;
    message: string;
    visible: boolean;
  } | null>(null);

  const outOfStock = product.stock === 0;
  const maxQty = Math.max(1, Math.min(10, product.stock));
  const wishlisted = hydrated && isWishlisted(product.id);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2_000);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs uppercase tracking-widest text-muted">
          Quantity
        </span>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={maxQty}
          label={`Quantity for ${product.name}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Button
          size="lg"
          disabled={outOfStock}
          onClick={() => {
            const submittedQuantity = quantity;
            const result = addItem(product, submittedQuantity);
            if (result.addedQuantity > 0) {
              trackStorefrontEvent({
                type: "add_to_cart",
                product,
                quantity: result.addedQuantity,
              });
              setAdded(true);
            } else {
              setAdded(false);
            }
            announcementSequence.current += 1;
            const limitMessage =
              result.reason === "cart_limit"
                ? "Your cart has reached its item limit."
                : "This item is already at the 10-unit cart limit.";
            setAnnouncement({
              id: announcementSequence.current,
              message:
                result.addedQuantity > 0
                  ? `${result.addedQuantity} ${product.name} added to cart.${
                      result.reason ? ` ${limitMessage}` : ""
                    }`
                  : limitMessage,
              visible: result.reason !== null,
            });
          }}
          className="col-span-2 w-full min-w-0 sm:col-span-1"
        >
          {outOfStock ? (
            "Sold Out"
          ) : added ? (
            <>
              <Check size={16} aria-hidden /> Added to Cart
            </>
          ) : (
            <>
              <ShoppingBag size={16} aria-hidden /> Add to Cart
            </>
          )}
        </Button>
        <button
          type="button"
          aria-pressed={wishlisted}
          onClick={() => toggleWishlist(product.id)}
          className={`inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm uppercase tracking-wide shadow-sm transition-colors sm:w-auto ${
            wishlisted
              ? "border-action bg-action text-white"
              : "border-line bg-card text-muted hover:border-gold hover:text-gold"
          }`}
        >
          <Heart
            size={16}
            fill={wishlisted ? "currentColor" : "none"}
            aria-hidden
          />
          {wishlisted ? "Saved" : "Wishlist"}
        </button>
        <ShareButton name={product.name} />
      </div>

      <p
        className={
          announcement?.visible
            ? "text-sm leading-relaxed text-gold"
            : "sr-only"
        }
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement && (
          <span key={announcement.id}>{announcement.message}</span>
        )}
      </p>
    </div>
  );
}
