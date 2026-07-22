"use client";

import { useEffect, useState } from "react";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import type { Product } from "@/lib/types";

/** Client island: PDP purchase controls — quantity, add-to-cart, wishlist. */

export function AddToCartPanel({ product }: { product: Product }) {
  const { addItem, isWishlisted, toggleWishlist, hydrated } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock === 0;
  // Cart caps at 10 per item; don't offer more than we can sell.
  const maxQty = Math.max(1, Math.min(10, product.stock));
  const wishlisted = hydrated && isWishlisted(product.id);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
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
        />
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        <Button
          size="lg"
          disabled={outOfStock}
          onClick={() => {
            addItem(product, quantity);
            setAdded(true);
          }}
          className="min-w-52 flex-1 sm:flex-none"
        >
          {outOfStock ? (
            "Sold Out"
          ) : added ? (
            <>
              <Check size={16} /> Added to Cart
            </>
          ) : (
            <>
              <ShoppingBag size={16} /> Add to Cart
            </>
          )}
        </Button>
        <button
          type="button"
          aria-pressed={wishlisted}
          onClick={() => toggleWishlist(product.id)}
          className={`inline-flex items-center gap-2 border px-5 py-3.5 text-sm uppercase tracking-wide transition-colors cursor-pointer ${
            wishlisted
              ? "border-block bg-block text-block-text"
              : "border-line text-muted hover:border-gold hover:text-gold"
          }`}
        >
          <Heart size={16} fill={wishlisted ? "currentColor" : "none"} />
          {wishlisted ? "Saved" : "Wishlist"}
        </button>
      </div>
    </div>
  );
}
