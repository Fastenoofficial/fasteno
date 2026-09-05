import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { getProducts } from "@/lib/catalog";
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
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const products = q ? await getProducts({ query: q, sort: "featured" }) : [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <header className="mb-10">
        <p className="eyebrow mb-3">Find the finishing touch</p>
        <h1 className="font-display text-4xl text-ivory md:text-5xl">Search</h1>
        <div className="gold-rule mt-4" />
      </header>

      <div className="max-w-2xl">
        <SearchAutocomplete defaultValue={q} />
      </div>

      <div className="mt-12">
        {q === "" ? (
          <EmptyState
            icon={<Search size={36} strokeWidth={1.25} />}
            title="What are you looking for?"
            description="Search by name, colour, material or occasion — try “navy silk” or “wedding”."
            actionLabel="Browse everything"
            actionHref="/shop"
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<SearchX size={36} strokeWidth={1.25} />}
            title={`No results for “${q}”`}
            description="Check the spelling or try a broader term — colours, materials and occasions all work."
            actionLabel="Browse the collection"
            actionHref="/shop"
          />
        ) : (
          <>
            <p className="mb-6 text-xs uppercase tracking-[0.18em] text-muted">
              {products.length} {products.length === 1 ? "result" : "results"}{" "}
              for <span className="text-gold">“{q}”</span>
            </p>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
