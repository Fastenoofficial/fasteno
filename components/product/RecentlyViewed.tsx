"use client";

import { useEffect, useState } from "react";
import { ProductListAnalytics } from "@/lib/analytics-client";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Product } from "@/lib/types";

/** Client island for the PDP: records the current product in the
 * localStorage browsing trail (`fs-recently-viewed`, max 8 slugs,
 * most-recent first) and renders the other products in the trail. */

const STORAGE_KEY = "fs-recently-viewed";
const MAX_SLUGS = 8;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readTrail(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.length <= 80 &&
          SLUG_RE.test(value),
      )
      .slice(0, MAX_SLUGS);
  } catch {
    return [];
  }
}

export function RecentlyViewed({ slug }: { slug: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trail = [slug, ...readTrail().filter((value) => value !== slug)].slice(
      0,
      MAX_SLUGS,
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
    } catch {
      // Storage full/blocked — the rail still works for this visit.
    }

    const others = trail.filter((value) => value !== slug);
    if (others.length === 0) {
      setProducts([]);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(
          `/api/products/by-slugs?slugs=${encodeURIComponent(others.join(","))}`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        const list = Array.isArray((data as { products?: unknown })?.products)
          ? ((data as { products: Product[] }).products)
          : [];
        const rank = new Map(others.map((value, index) => [value, index]));
        list.sort(
          (a, b) =>
            (rank.get(a.slug) ?? MAX_SLUGS) -
            (rank.get(b.slug) ?? MAX_SLUGS),
        );
        if (!cancelled) setProducts(list.slice(0, MAX_SLUGS));
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!products || products.length === 0) return null;

  return (
    <div className="mt-20 border-t border-line pt-14">
      <SectionHeading
        eyebrow="Your trail"
        title="Recently Viewed"
        description="Pieces you looked at earlier — still where you left them."
      />
      <ProductListAnalytics list="recently_viewed" products={products} />
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            listContext="recently_viewed"
            position={index}
          />
        ))}
      </div>
    </div>
  );
}
