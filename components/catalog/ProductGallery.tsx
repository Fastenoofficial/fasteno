"use client";

import { useState } from "react";

/** Client island: PDP image gallery with thumbnail switcher.
 *  Each product ships two SVGs (main + detail). Plain <img> — never next/image. */

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
    <div className="space-y-3">
      <div className="overflow-hidden border border-line bg-surface">
        <img
          src={current}
          alt={name}
          className="aspect-[4/5] h-auto w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`View image ${i + 1} of ${name}`}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className={`w-20 overflow-hidden border transition-colors cursor-pointer sm:w-24 ${
                i === active
                  ? "border-gold"
                  : "border-line opacity-70 hover:border-gold/60 hover:opacity-100"
              }`}
            >
              <img
                src={src}
                alt=""
                className="aspect-[4/5] h-auto w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
