"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Product } from "@/lib/types";

/** Client island for the PDP: records the current product in the
 *  localStorage browsing trail (`fs-recently-viewed`, max 8 slugs,
 *  most-recent first) and renders a "Recently viewed" rail of the OTHER
 *  products in the trail. Renders nothing until mounted, and nothing at
 *  all when the visitor has no earlier history. */

const STORAGE_KEY = "fs-recently-viewed";
const MAX_SLUGS = 8;

function readTrail(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

export function RecentlyViewed({ slug }: { slug: string }) {
  // null = not mounted / still loading → render nothing (no layout shift
  // vs. server HTML, which never contains this section).
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Record the current product at the front of the trail.
    const trail = [slug, ...readTrail().filter((s) => s !== slug)].slice(
      0,
      MAX_SLUGS,
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trail));
    } catch {
      // storage full/blocked — the rail still works for this visit
    }

    const others = trail.filter((s) => s !== slug);
    if (others.length === 0) {
      setProducts([]);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/products/by-slugs?slugs=${encodeURIComponent(others.join(","))}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        const list = Array.isArray((data as { products?: unknown })?.products)
          ? ((data as { products: Product[] }).products)
          : [];
        // Keep most-recent-first order regardless of API ordering.
        const rank = new Map(others.map((s, i) => [s, i]));
        list.sort(
          (a, b) =>
            (rank.get(a.slug) ?? MAX_SLUGS) - (rank.get(b.slug) ?? MAX_SLUGS),
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
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
