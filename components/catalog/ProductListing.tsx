import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/catalog/FilterBar";
import {
  hasActiveFilters,
  type ListingParams,
} from "@/components/catalog/query";
import type { Product } from "@/lib/types";

/** Server-rendered listing body shared by /shop and /shop/[category]:
 *  filter bar island + result count + product grid / empty state. */

interface ProductListingProps {
  basePath: string;
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
  products,
  params,
  options,
}: ProductListingProps) {
  const filtered = hasActiveFilters(params);
  return (
    <div className="space-y-6">
      <FilterBar basePath={basePath} options={options} params={params} />

      <p className="text-xs uppercase tracking-[0.18em] text-muted">
        {products.length === 0
          ? "No pieces found"
          : `Showing ${products.length} ${products.length === 1 ? "piece" : "pieces"}`}
        {filtered && " · filtered"}
      </p>

      {products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={36} strokeWidth={1.25} />}
          title="Nothing matches those filters"
          description="Try loosening a filter or two — the right finishing touch is in here somewhere."
          actionLabel="Clear filters"
          actionHref={basePath}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
