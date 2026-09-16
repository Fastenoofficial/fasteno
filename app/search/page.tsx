import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import {
  ProductListAnalytics,
  SearchResultsAnalytics,
} from "@/lib/analytics-client";
import { ProductCard } from "@/components/ui/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search the Fasteno Shyama collection — ties, cufflinks, brooches, pocket squares, buttons and gift sets.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const search = await searchParams;
  const query = (Array.isArray(search.q) ? search.q[0] : search.q)?.trim() ?? "";
  const products = query
    ? await getProducts({ query, sort: "featured" })
    : [];
  const queryLength = Array.from(query).length;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      {query && (
        <SearchResultsAnalytics
          queryLength={queryLength}
          resultCount={products.length}
        />
      )}
      <header className="mb-10">
        <p className="eyebrow mb-3">Find the finishing touch</p>
        <h1 className="font-display text-4xl text-ivory md:text-5xl">Search</h1>
        <div className="gold-rule mt-4" />
      </header>

      <div className="max-w-2xl">
        <SearchAutocomplete defaultValue={query} />
      </div>

      <div className="mt-12">
        {query === "" ? (
          <EmptyState
            headingLevel={2}
            icon={<Search size={36} strokeWidth={1.25} />}
            title="What are you looking for?"
            description="Search by name, colour, material or occasion — try “navy silk” or “wedding”."
            actionLabel="Browse everything"
            actionHref="/shop"
          />
        ) : products.length === 0 ? (
          <EmptyState
            headingLevel={2}
            icon={<SearchX size={36} strokeWidth={1.25} />}
            title={`No results for “${query}”`}
            description="Check the spelling or try a broader term — colours, materials and occasions all work."
            actionLabel="Browse the collection"
            actionHref="/shop"
          />
        ) : (
          <>
            <p className="mb-6 text-xs uppercase tracking-[0.18em] text-muted">
              {products.length} {products.length === 1 ? "result" : "results"}{" "}
              for <span className="text-gold">“{query}”</span>
            </p>
            <ProductListAnalytics list="search_results" products={products} />
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  listContext="search_results"
                  position={index}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
