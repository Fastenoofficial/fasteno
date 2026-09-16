"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { StorefrontImage } from "@/components/ui/StorefrontImage";
import {
  trackStorefrontEvent,
  type StorefrontListContext,
} from "@/lib/analytics-client";
import { titleCase } from "@/lib/format";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  listContext?: StorefrontListContext;
  position?: number;
}

/** The product tile used on home, shop, search and related-product rails. */
export function ProductCard({
  product,
  listContext = "shop_all",
  position = 0,
}: ProductCardProps) {
  const { addItem, isWishlisted, toggleWishlist } = useCart();
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const wishlisted = isWishlisted(product.id);
  const noticeSequence = useRef(0);
  const [cartNotice, setCartNotice] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const trackSelection = () => {
    trackStorefrontEvent({
      type: "select_item",
      list: listContext,
      product,
      index: position,
    });
  };

  return (
    <div className="lift group relative flex flex-col overflow-hidden rounded-2xl border border-line-soft bg-card shadow-[var(--shadow-card)]">
      {/* The name link remains the only keyboard stop; this valid secondary
          link stays available to pointer and screen-reader navigation. */}
      <Link
        href={`/product/${product.slug}`}
        tabIndex={-1}
        aria-label={`View ${product.name}`}
        onClick={trackSelection}
        className="relative block aspect-[4/5] overflow-hidden bg-surface"
      >
        <StorefrontImage
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-keynote/10 to-transparent" />
        {onSale && (
          <span className="absolute left-3 top-3">
            <Badge tone="gold">Sale</Badge>
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute right-3 top-3">
            <Badge tone="muted">Sold out</Badge>
          </span>
        )}
      </Link>

      <button
        type="button"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => toggleWishlist(product.id)}
        className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition-[background-color,border-color,color,opacity] ${
          wishlisted
            ? "border-gold-light bg-gold-light text-action"
            : "border-white/70 bg-white/85 text-muted opacity-100 hover:border-gold-light hover:text-gold focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        } ${product.stock === 0 ? "top-12" : ""}`}
      >
        <Heart
          size={15}
          fill={wishlisted ? "currentColor" : "none"}
          aria-hidden
        />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-soft">
          {titleCase(product.category)}
        </p>
        <Link
          href={`/product/${product.slug}`}
          onClick={trackSelection}
          className="font-display text-base font-semibold leading-snug tracking-[-0.01em] text-ivory transition-colors hover:text-gold"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-3">
          <PriceTag
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="sm"
          />
          <button
            type="button"
            aria-label={
              product.stock === 0
                ? `${product.name} is sold out`
                : `Add ${product.name} to cart`
            }
            disabled={product.stock === 0}
            onClick={() => {
              const result = addItem(product);
              if (result.addedQuantity > 0) {
                trackStorefrontEvent({
                  type: "add_to_cart",
                  product,
                  quantity: result.addedQuantity,
                });
              }
              if (result.reason) {
                noticeSequence.current += 1;
                setCartNotice({
                  id: noticeSequence.current,
                  message:
                    result.reason === "cart_limit"
                      ? "Your cart has reached its item limit."
                      : "This item is already at the 10-unit cart limit.",
                });
              } else {
                setCartNotice(null);
              }
            }}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition-colors hover:border-action hover:bg-action hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <ShoppingBag size={15} aria-hidden />
          </button>
        </div>
        {cartNotice && (
          <p
            role="status"
            aria-live="polite"
            className="mt-1 text-xs leading-relaxed text-muted"
          >
            <span key={cartNotice.id}>{cartNotice.message}</span>
          </p>
        )}
      </div>
    </div>
  );
}
