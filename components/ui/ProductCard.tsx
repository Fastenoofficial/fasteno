"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { PriceTag } from "@/components/ui/PriceTag";
import { Badge } from "@/components/ui/Badge";
import { titleCase } from "@/lib/format";
import type { Product } from "@/lib/types";

/** The product tile used on home, shop, search and related-product rails. */
export function ProductCard({ product }: { product: Product }) {
  const { addItem, isWishlisted, toggleWishlist } = useCart();
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="lift group relative flex flex-col bg-transparent transition-colors hover:bg-surface">
      {/* image */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-surface"
      >
        {/* SVG artwork — plain img keeps it crisp with zero optimisation cost */}
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
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

      {/* wishlist */}
      <button
        type="button"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => toggleWishlist(product.id)}
        className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center border transition-colors cursor-pointer ${
          wishlisted
            ? "border-gold bg-gold-light text-ivory"
            : "border-line bg-ink/80 text-muted opacity-100 backdrop-blur-sm hover:text-gold focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        } ${product.stock === 0 ? "top-12" : ""}`}
      >
        <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
      </button>

      {/* info */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
          {titleCase(product.category)}
        </p>
        <Link
          href={`/product/${product.slug}`}
          className="font-display text-base leading-snug text-ivory transition-colors hover:text-gold"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <PriceTag
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="sm"
          />
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            disabled={product.stock === 0}
            onClick={() => addItem(product)}
            className="inline-flex h-9 w-9 items-center justify-center border border-line text-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-30 cursor-pointer"
          >
            <ShoppingBag size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
