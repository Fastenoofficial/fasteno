"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Category } from "@/lib/types";

/** Representative artwork per category, drawn from the generated catalogue SVGs. */
const categoryArt: Record<string, string> = {
  ties: "/products/burgundy-repp-stripe-tie.svg",
  cufflinks: "/products/mother-of-pearl-round-cufflinks.svg",
  brooches: "/products/kundan-peacock-brooch.svg",
  "pocket-squares": "/products/burgundy-paisley-pocket-square.svg",
  buttons: "/products/golden-brass-blazer-buttons.svg",
  "gift-sets": "/products/the-monarch-gift-set.svg",
};

function CategoryImage({ category }: { category: Category }) {
  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          [
            category.image_url?.trim(),
            categoryArt[category.slug],
            `/products/${category.slug}.svg`,
          ].filter((source): source is string => Boolean(source)),
        ),
      ),
    [category.image_url, category.slug],
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  if (exhausted || !sources[sourceIndex]) {
    return (
      <div
        role="img"
        aria-label={category.name}
        className="flex h-full w-full items-center justify-center bg-surface text-muted"
      >
        <ImageIcon aria-hidden size={34} strokeWidth={1.4} />
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={category.name}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (sourceIndex + 1 < sources.length) {
          setSourceIndex((index) => index + 1);
        } else {
          setExhausted(true);
        }
      }}
      className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.05]"
    />
  );
}

/** Manual, scroll-snap category rail linking into the shop. */
export function CategoryTiles({ categories }: { categories: Category[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const displayCategories = useMemo(
    () => categories.filter((category) => category.display_on_home !== false),
    [categories],
  );

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCanScrollPrevious(rail.scrollLeft > 2);
    setCanScrollNext(rail.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScrollState);
    observer?.observe(rail);
    for (const card of Array.from(rail.children)) observer?.observe(card);

    return () => {
      window.cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
    };
  }, [displayCategories.length, updateScrollState]);

  const scrollTo = useCallback((index: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const cards = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-category-card]"),
    );
    const card = cards[Math.max(0, Math.min(index, cards.length - 1))];
    if (!card) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    rail.scrollTo({
      left: Math.min(card.offsetLeft, rail.scrollWidth - rail.clientWidth),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, []);

  const nearestCardIndex = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return 0;
    const cards = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-category-card]"),
    );
    return cards.reduce(
      (nearest, card, index) =>
        Math.abs(card.offsetLeft - rail.scrollLeft) <
        Math.abs(cards[nearest].offsetLeft - rail.scrollLeft)
          ? index
          : nearest,
      0,
    );
  }, []);

  function moveOne(direction: -1 | 1) {
    scrollTo(nearestCardIndex() + direction);
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    // Card links keep their native keyboard behavior; these shortcuts apply
    // only when the scroll viewport itself owns focus.
    if (event.target !== event.currentTarget) return;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      moveOne(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      scrollTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      scrollTo(displayCategories.length - 1);
    }
  }

  if (displayCategories.length === 0) return null;

  return (
    <section
      aria-label="Shop by category"
      aria-describedby="category-rail-instructions"
      className="relative"
    >
      <p id="category-rail-instructions" className="sr-only">
        Scroll horizontally by touch or trackpad. When this category rail is
        focused, use Left and Right Arrow to move one category, or Home and End
        to jump to either edge. Each category link remains available with Tab.
      </p>

      <div className="mb-4 hidden items-center justify-end gap-2 md:flex">
        <button
          type="button"
          onClick={() => moveOne(-1)}
          disabled={!canScrollPrevious}
          aria-label="Previous category"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ivory shadow-sm transition-colors hover:border-gold-light hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft aria-hidden size={20} />
        </button>
        <button
          type="button"
          onClick={() => moveOne(1)}
          disabled={!canScrollNext}
          aria-label="Next category"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ivory shadow-sm transition-colors hover:border-gold-light hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight aria-hidden size={20} />
        </button>
      </div>

      <ul
        ref={railRef}
        tabIndex={0}
        onKeyDown={handleRailKeyDown}
        aria-label="Category cards"
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-1 pb-4 focus-visible:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light sm:gap-5 lg:gap-6"
      >
        {displayCategories.map((category) => (
          <li
            key={category.slug}
            data-category-card
            className="w-[84%] shrink-0 snap-start sm:w-[47%] lg:w-[31%] xl:w-[30%]"
          >
            <Link
              href={`/shop/${category.slug}`}
              className="lift group relative block h-full overflow-hidden rounded-2xl border border-line-soft bg-card shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                <CategoryImage
                  key={`${category.slug}:${category.image_url ?? "fallback"}`}
                  category={category}
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-keynote/90 via-keynote/35 to-transparent" />
                <h3 className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-semibold tracking-[-0.02em] text-white transition-colors group-hover:text-gold-light sm:p-5 sm:text-xl">
                  {category.name}
                </h3>
              </div>
              <div className="border-t border-line-soft bg-card p-4 sm:p-5">
                <p className="hidden text-xs leading-relaxed text-muted sm:block">
                  {category.description}
                </p>
                <p className="eyebrow mt-1 sm:mt-3">
                  Shop {category.name} →
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
