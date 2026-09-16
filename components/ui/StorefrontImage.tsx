"use client";

import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { ImageOff } from "lucide-react";

interface StorefrontImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src?: string | null;
  alt: string;
  fallbackClassName?: string;
}

function ImageFallback({
  alt,
  className,
}: {
  alt: string;
  className: string;
}) {
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      data-image-fallback="true"
      className={`flex h-full w-full items-center justify-center bg-surface text-muted-soft ${className}`}
    >
      <ImageOff size={20} strokeWidth={1.4} aria-hidden />
    </span>
  );
}

/**
 * Customer-facing image with a stable, in-layout fallback. The surrounding
 * element remains the source of truth for size, so a missing or failed image
 * never collapses a product card, cart row, or order summary.
 */
export function StorefrontImage({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  onError,
  ...props
}: StorefrontImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = !src || failedSource === src;

  if (failed) {
    return (
      <ImageFallback
        alt={alt}
        className={`${className} ${fallbackClassName}`}
      />
    );
  }

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    setFailedSource(src);
    onError?.(event);
  };

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={handleError} {...props} />;
}

interface StorefrontPictureProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  src: string;
  mobileSrc?: string | null;
  forceMobile?: boolean;
  alt: string;
  pictureClassName?: string;
  fallbackClassName?: string;
}

/** Responsive variant that replaces the whole picture on load failure. */
export function StorefrontPicture({
  src,
  mobileSrc,
  forceMobile = false,
  alt,
  pictureClassName = "",
  className = "",
  fallbackClassName = "",
  onError,
  ...props
}: StorefrontPictureProps) {
  const signature = `${src}|${mobileSrc ?? ""}|${forceMobile}`;
  const [failedSignature, setFailedSignature] = useState<string | null>(null);

  if (failedSignature === signature) {
    return (
      <ImageFallback
        alt={alt}
        className={`${pictureClassName} ${className} ${fallbackClassName}`}
      />
    );
  }

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    setFailedSignature(signature);
    onError?.(event);
  };

  return (
    <picture className={pictureClassName}>
      {forceMobile ? (
        <source media="(min-width: 0px)" srcSet={mobileSrc ?? src} />
      ) : (
        mobileSrc && <source media="(max-width: 768px)" srcSet={mobileSrc} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
        {...props}
      />
    </picture>
  );
}
