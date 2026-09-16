"use client";

import { useState } from "react";
import { StorefrontImage } from "@/components/ui/StorefrontImage";

/** Client island: PDP image gallery with resilient main and thumbnail images. */
export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 lg:max-w-none">
      <div className="overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-[var(--shadow-card)]">
        <StorefrontImage
          src={current}
          alt={name}
          className="aspect-[4/5] h-auto w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div
          role="group"
          aria-label={`Choose an image of ${name}`}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        >
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              aria-label={`Show image ${index + 1} of ${images.length} for ${name}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className={`w-20 shrink-0 snap-start cursor-pointer overflow-hidden rounded-xl border bg-surface transition-[border-color,opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:w-24 ${
                index === active
                  ? "border-gold ring-1 ring-gold/25"
                  : "border-line opacity-70 hover:border-gold/60 hover:opacity-100"
              }`}
            >
              <StorefrontImage
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] h-auto w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
