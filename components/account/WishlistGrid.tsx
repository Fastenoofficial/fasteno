"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { ProductListAnalytics } from "@/lib/analytics-client";
import { fetchWishlistProducts } from "@/components/account/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/lib/types";

/** Wishlist grid — works in demo and live mode. */
export function WishlistGrid() {
  const { hydrated, wishlist } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (wishlist.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    fetchWishlistProducts(wishlist)
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, wishlist]);

  if (!hydrated || products === null) {
    return (
      <div role="status" aria-label="Loading wishlist">
        <span className="sr-only">Loading wishlist…</span>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/5] border border-line bg-card motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        icon={<Heart size={32} strokeWidth={1.5} />}
        title="Your wishlist is empty"
        description="Tap the heart on any product to keep it here for later."
        actionLabel="Browse the Collection"
        actionHref="/shop"
      />
    );
  }

  return (
    <>
      <ProductListAnalytics list="wishlist" products={products} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            listContext="wishlist"
            position={index}
          />
        ))}
      </div>
    </>
  );
}
