import type { Metadata } from "next";
import { Search, SearchX } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/ui/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search the Fasteno Shyama collection — ties, cufflinks, brooches, pocket squares, buttons and gift sets.",
};

const POPULAR_SEARCHES = ["silk tie", "wedding", "cufflinks", "gift", "navy"];

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

      {/* GET form — server-rendered, no JS needed */}
      <form action="/search" method="get" className="max-w-2xl">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search ties, cufflinks, colours, occasions…"
              aria-label="Search products"
              autoComplete="off"
              className="w-full border border-line bg-card py-3 pl-11 pr-4 text-sm text-ivory placeholder:text-muted/60 transition-colors focus:border-gold/70 focus:outline-none"
            />
          </div>
          <Button type="submit" size="md">
            Search
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="uppercase tracking-[0.14em]">Popular:</span>
        {POPULAR_SEARCHES.map((term) => (
          <a
            key={term}
            href={`/search?q=${encodeURIComponent(term)}`}
            className="border border-line px-2.5 py-1 transition-colors hover:border-gold hover:text-gold"
          >
            {term}
          </a>
        ))}
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
