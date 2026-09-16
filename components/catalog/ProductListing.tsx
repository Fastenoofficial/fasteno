import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/ui/ProductCard";
import { FilterBar } from "@/components/catalog/FilterBar";
import {
  ProductListAnalytics,
  type StorefrontListContext,
} from "@/lib/analytics-client";
import { hasActiveFilters, type ListingParams } from "@/components/catalog/query";
import type { Product } from "@/lib/types";

interface ProductListingProps {
  basePath: string;
  listContext: StorefrontListContext;
  products: Product[];
  params: ListingParams;
  options: {
    colors: string[];
    materials: string[];
    patterns: string[];
    maxPrice: number;
  };
}

export function ProductListing({
  basePath,
  listContext,
  products,
  params,
  options,
}: ProductListingProps) {
  const filtered = hasActiveFilters(params);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
      <ProductListAnalytics list={listContext} products={products} />
      <aside className="lg:col-span-3">
        <FilterBar basePath={basePath} options={options} params={params} />
      </aside>

      <div className="min-w-0 lg:col-span-9">
        <p
          aria-live="polite"
          className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-muted"
        >
          {products.length === 0
            ? "No pieces found"
            : `Showing ${products.length} ${products.length === 1 ? "piece" : "pieces"}`}
          {filtered && " · filtered"}
        </p>

        {products.length === 0 ? (
          <EmptyState
            headingLevel={2}
            icon={<PackageSearch size={36} strokeWidth={1.25} />}
            title="Nothing matches those filters"
            description="Try loosening a filter or two — the right finishing touch is in here somewhere."
            actionLabel="Clear filters"
            actionHref={basePath}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                listContext={listContext}
                position={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
