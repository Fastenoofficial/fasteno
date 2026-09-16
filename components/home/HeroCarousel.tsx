"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  StorefrontImage,
  StorefrontPicture,
} from "@/components/ui/StorefrontImage";
import { SITE_URL } from "@/lib/config";
import { formatINR } from "@/lib/format";
import type { HeroCarouselSlide } from "@/lib/banner-types";

const AUTOPLAY_INTERVAL_MS = 6_000;
const SWIPE_THRESHOLD_PX = 48;

type PreviewMode = "desktop" | "mobile";

interface HeroCarouselProps {
  slides: HeroCarouselSlide[];
  previewMode?: PreviewMode;
  label?: string;
}

interface PointerStart {
  id: number;
  x: number;
  y: number;
  captured: boolean;
}

function pointsToGiftSets(href: string): boolean {
  try {
    const site = new URL(SITE_URL);
    const url = new URL(href, site);
    return (
      url.origin === site.origin &&
      url.pathname.replace(/\/+$/, "") === "/shop/gift-sets"
    );
  } catch {
    return false;
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("a, button, input, select, textarea, label"))
  );
}

export function HeroCarousel({
  slides,
  previewMode,
  label = "Featured collections",
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [timerReset, setTimerReset] = useState(0);
  const [manualStatus, setManualStatus] = useState("");
  const pointerStart = useRef<PointerStart | null>(null);

  const slideCount = slides.length;
  const hasMultipleSlides = slideCount > 1 && !previewMode;

  useEffect(() => {
    if (activeIndex >= slideCount) setActiveIndex(0);
  }, [activeIndex, slideCount]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setDocumentHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const autoplayActive =
    hasMultipleSlides &&
    autoplayEnabled &&
    !hovered &&
    !focusWithin &&
    !documentHidden &&
    !reducedMotion;

  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoplayActive, slideCount, timerReset]);

  const navigateManually = useCallback(
    (nextIndex: number) => {
      if (slideCount < 2) return;
      const wrappedIndex = (nextIndex + slideCount) % slideCount;
      setActiveIndex(wrappedIndex);
      setTimerReset((value) => value + 1);
      const nextSlide = slides[wrappedIndex];
      setManualStatus(
        `Slide ${wrappedIndex + 1} of ${slideCount}: ${nextSlide.title || "Hero banner"}`,
      );
    },
    [slideCount, slides],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Arrow navigation belongs to the non-interactive carousel region only;
    // links and controls keep their native keyboard behaviour.
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateManually(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateManually(activeIndex + 1);
    }
  }

  function handleFocus(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.target)) setFocusWithin(true);
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setFocusWithin(false);
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!event.isPrimary || isInteractiveTarget(event.target)) return;
    pointerStart.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      captured: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId || start.captured) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
        start.captured = true;
      } catch {
        // Pointer capture is an enhancement; the threshold still protects taps.
      }
    }
  }

  function finishPointer(event: ReactPointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId) return;

    if (start.captured) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // The browser may already have released capture.
      }
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (
      Math.abs(dx) >= SWIPE_THRESHOLD_PX &&
      Math.abs(dx) > Math.abs(dy) * 1.2
    ) {
      navigateManually(activeIndex + (dx < 0 ? 1 : -1));
    }
  }

  if (slideCount === 0) return null;

  const isPreview = Boolean(previewMode);
  const heightClass =
    previewMode === "mobile"
      ? "min-h-[32rem]"
      : previewMode === "desktop"
        ? "min-h-[25rem]"
        : "min-h-[38rem] sm:min-h-[42rem] lg:min-h-[46rem]";

  return (
    <section
      role="region"
      aria-roledescription={isPreview ? undefined : "carousel"}
      aria-label={label}
      tabIndex={isPreview ? undefined : 0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
      className={`on-dark relative isolate overflow-hidden border-b border-white/10 bg-keynote text-block-text outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C5A059] ${heightClass}`}
      style={{ touchAction: "pan-y" }}
    >
      {slides.map((slide, index) => {
        const active = index === activeIndex;
        const giftSetsPrimary = slide.cta
          ? pointsToGiftSets(slide.cta.href)
          : false;
        const foregroundLayout = previewMode
          ? "px-5 py-8"
          : "mx-auto flex min-h-[38rem] max-w-[90rem] items-center px-4 py-16 sm:min-h-[42rem] sm:px-6 lg:min-h-[46rem] lg:px-8 lg:py-24";
        const titleClass = previewMode
          ? "text-3xl"
          : "text-4xl sm:text-5xl lg:text-6xl";

        return (
          <article
            key={slide.id}
            role="group"
            aria-roledescription={isPreview ? undefined : "slide"}
            aria-label={isPreview ? undefined : `${index + 1} of ${slideCount}`}
            aria-hidden={active ? undefined : true}
            inert={active ? undefined : true}
            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
              active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
            }`}
          >
            <StorefrontPicture
              src={slide.desktopImage}
              mobileSrc={
                previewMode === "mobile"
                  ? (slide.mobileImage ?? slide.desktopImage)
                  : !previewMode
                    ? slide.mobileImage
                    : undefined
              }
              forceMobile={previewMode === "mobile"}
              alt={slide.imageAlt}
              pictureClassName="absolute inset-0 block h-full w-full"
              className="h-full w-full object-cover"
              draggable={false}
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07101F]/95 via-[#0D172A]/82 to-[#0D172A]/25" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07101F]/75 via-transparent to-[#07101F]/20" />

            <div className={`relative z-10 ${foregroundLayout}`}>
              <div className={previewMode === "mobile" ? "max-w-xs" : "max-w-3xl"}>
                {slide.eyebrow && (
                  <p className="eyebrow mb-5">{slide.eyebrow}</p>
                )}
                {slide.title && (
                  <h1
                    className={`font-display font-semibold leading-[1.06] tracking-[-0.04em] text-block-text ${titleClass}`}
                  >
                    {slide.title}
                    <span className="text-[#C5A059]">.</span>
                  </h1>
                )}
                {slide.subtitle && (
                  <>
                    <div className="gold-rule mt-6" />
                    <p className="mt-6 max-w-xl text-base leading-relaxed text-block-text/80 lg:text-lg">
                      {slide.subtitle}
                    </p>
                  </>
                )}

                {active && (
                  <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
                    {slide.cta &&
                      (isPreview ? (
                        <span
                          className={`inline-flex min-h-11 items-center justify-center rounded-full border px-6 py-2.5 text-xs font-medium uppercase tracking-[0.05em] ${
                            giftSetsPrimary
                              ? "border-[#C5A059] bg-[#C5A059] text-[#0D172A]"
                              : "border-[#C5A059]/40 bg-[#0D172A] text-white"
                          }`}
                        >
                          {slide.cta.text}
                        </span>
                      ) : (
                        <Button
                          href={slide.cta.href}
                          variant={giftSetsPrimary ? "champagne" : "primary"}
                          size="lg"
                          className="shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
                        >
                          {slide.cta.text}
                        </Button>
                      ))}
                    {!giftSetsPrimary &&
                      (isPreview ? (
                        <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#C5A059] bg-[#C5A059] px-6 py-2.5 text-xs font-medium uppercase tracking-[0.05em] text-[#0D172A]">
                          Explore Gift Sets
                        </span>
                      ) : (
                        <Button
                          href="/shop/gift-sets"
                          variant="champagne"
                          size="lg"
                        >
                          Explore Gift Sets
                        </Button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {active && slide.accentImage && (
              <div className="absolute bottom-20 right-4 z-20 w-28 overflow-hidden rounded-2xl border border-[#C5A059]/50 bg-card shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:right-8 sm:w-40 lg:bottom-16 lg:right-[8%] lg:w-52">
                <StorefrontImage
                  src={slide.accentImage.src}
                  alt={slide.accentImage.alt}
                  className="aspect-square h-auto w-full object-cover"
                  draggable={false}
                />
              </div>
            )}

            {active && slide.accentLabel && (
              <p className="eyebrow absolute bottom-24 right-36 z-20 hidden -rotate-90 lg:block lg:right-[calc(8%+13rem)]">
                {slide.accentLabel}
              </p>
            )}

            {active && slide.productCallouts.length > 0 && (
              <ol className="absolute bottom-20 right-4 z-20 flex max-w-[calc(100%-2rem)] gap-2 sm:right-8 sm:gap-3 lg:bottom-16 lg:right-[6%]">
                {slide.productCallouts.map((product) => {
                  const content = (
                    <>
                      <StorefrontImage
                        src={product.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16"
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-[0.14em] text-[#0D172A]/65">
                          Product {product.slot}
                        </span>
                        <span className="block truncate text-sm font-medium text-[#0D172A]">
                          {product.name}
                        </span>
                        <span className="block text-xs text-[#0D172A]/75">
                          {formatINR(product.price)}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={`${product.slot}-${product.id}`}>
                      {isPreview ? (
                        <div className="flex max-w-52 items-center gap-2 rounded-xl border border-[#C5A059]/60 bg-white/92 p-2 shadow-xl">
                          {content}
                        </div>
                      ) : (
                        <Link
                          href={`/product/${product.slug}`}
                          className="flex min-h-11 max-w-52 items-center gap-2 rounded-xl border border-[#C5A059]/60 bg-white/92 p-2 shadow-xl transition-transform motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 motion-reduce:transition-none"
                          aria-label={`View ${product.name}, ${formatINR(product.price)}`}
                        >
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </article>
        );
      })}

      {hasMultipleSlides && (
        <div className="absolute inset-x-0 bottom-3 z-30 flex items-center justify-center gap-2 px-16 sm:bottom-5">
          <button
            type="button"
            onClick={() => navigateManually(activeIndex - 1)}
            aria-label="Previous slide"
            className="absolute bottom-0 left-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-[#0D172A]/75 text-white backdrop-blur transition-colors hover:border-[#C5A059] hover:text-[#C5A059] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D172A] sm:left-6"
          >
            <ChevronLeft aria-hidden size={20} />
          </button>

          <div className="flex items-center rounded-full border border-white/20 bg-[#0D172A]/70 px-1 backdrop-blur">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => navigateManually(index)}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className="group flex h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
              >
                <span
                  className={`block h-2 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                    index === activeIndex
                      ? "w-6 bg-[#C5A059]"
                      : "w-2 bg-white/55 group-hover:bg-white"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (reducedMotion) return;
              setAutoplayEnabled((enabled) => {
                const next = !enabled;
                setManualStatus(next ? "Carousel playing" : "Carousel paused");
                return next;
              });
              setTimerReset((value) => value + 1);
            }}
            disabled={reducedMotion}
            aria-label={
              reducedMotion
                ? "Autoplay disabled by reduced motion preference"
                : autoplayEnabled
                  ? "Pause carousel"
                  : "Play carousel"
            }
            aria-pressed={!autoplayEnabled}
            className="absolute right-16 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-[#0D172A]/75 text-white backdrop-blur transition-colors hover:border-[#C5A059] hover:text-[#C5A059] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D172A] disabled:cursor-not-allowed disabled:opacity-55 sm:right-20"
          >
            {autoplayEnabled && !reducedMotion ? (
              <Pause aria-hidden size={17} />
            ) : (
              <Play aria-hidden size={17} />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigateManually(activeIndex + 1)}
            aria-label="Next slide"
            className="absolute bottom-0 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-[#0D172A]/75 text-white backdrop-blur transition-colors hover:border-[#C5A059] hover:text-[#C5A059] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D172A] sm:right-6"
          >
            <ChevronRight aria-hidden size={20} />
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {manualStatus}
      </p>
    </section>
  );
}
