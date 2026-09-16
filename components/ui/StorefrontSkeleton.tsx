interface ProductGridSkeletonProps {
  count?: number;
  className?: string;
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-line-soft motion-safe:animate-pulse ${className}`}
    />
  );
}

/** Reduced-motion-safe placeholder matching the catalog card footprint. */
export function ProductGridSkeleton({
  count = 6,
  className = "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3",
}: ProductGridSkeletonProps) {
  return (
    <div role="status" aria-label="Loading products">
      <span className="sr-only">Loading products…</span>
      <div className={className} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-line-soft bg-card"
          >
            <SkeletonBlock className="aspect-[4/5] w-full" />
            <div className="space-y-3 p-5">
              <SkeletonBlock className="h-2.5 w-20 rounded-full" />
              <SkeletonBlock className="h-5 w-4/5 rounded-full" />
              <div className="flex items-center justify-between pt-3">
                <SkeletonBlock className="h-4 w-24 rounded-full" />
                <SkeletonBlock className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Checkout-shaped placeholder used until persisted cart state is hydrated. */
export function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading checkout"
      className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]"
    >
      <span className="sr-only">Loading your checkout…</span>
      <div className="space-y-6" aria-hidden="true">
        {[0, 1, 2].map((section) => (
          <div key={section} className="border border-line bg-surface p-6">
            <SkeletonBlock className="h-6 w-40 rounded-full" />
            <SkeletonBlock className="mt-5 h-11 w-full rounded" />
            <SkeletonBlock className="mt-4 h-11 w-full rounded" />
          </div>
        ))}
      </div>
      <div className="h-fit border border-line bg-surface p-6" aria-hidden="true">
        <SkeletonBlock className="h-6 w-32 rounded-full" />
        <SkeletonBlock className="mt-6 h-16 w-full rounded" />
        <SkeletonBlock className="mt-4 h-16 w-full rounded" />
        <SkeletonBlock className="mt-8 h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Route-level storefront shell shown while a server segment is loading. */
export function StorefrontPageSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div role="status" aria-label="Loading page">
        <span className="sr-only">Loading page…</span>
        <div aria-hidden="true">
          <SkeletonBlock className="h-3 w-32 rounded-full" />
          <SkeletonBlock className="mt-4 h-12 w-64 max-w-full rounded" />
          <SkeletonBlock className="mt-4 h-1 w-16 rounded-full" />
          <div className="mt-10">
            <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
