"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep diagnostics local; error details are never forwarded to analytics.
    console.error("Storefront route failed", error);
  }, [error]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="eyebrow">Temporarily unavailable</p>
      <h1 className="mt-3 font-display text-4xl text-ivory">
        We couldn&apos;t load this page
      </h1>
      <div className="gold-rule mt-4" />
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted">
        Nothing has been changed in your cart. Please try loading the page
        again, or return to the collection in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-7 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-action bg-action px-6 py-2.5 text-sm font-medium uppercase tracking-[0.05em] text-white transition-colors hover:border-action-hover hover:bg-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </section>
  );
}
