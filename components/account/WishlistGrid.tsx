"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { fetchWishlistProducts } from "@/components/account/actions";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/lib/types";

/** Wishlist grid — works in demo AND live mode. Ids come from useCart
 *  (localStorage); products resolve via a server action so the catalog
 *  stays server-side. */
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

  // loading skeleton while hydrating / fetching
  if (!hydrated || products === null) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] animate-pulse border border-line bg-card"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={32} strokeWidth={1.5} />}
        title="Your wishlist is empty"
        description="Tap the heart on any product to keep it here for later."
        actionLabel="Browse the Collection"
        actionHref="/shop"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
