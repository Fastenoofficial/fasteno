"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clock, Search, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { StorefrontImage } from "@/components/ui/StorefrontImage";
import { trackStorefrontEvent } from "@/lib/analytics-client";
import { formatINR } from "@/lib/format";

interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  category: string | null;
}

interface SearchAutocompleteProps {
  placeholder?: string;
  defaultValue?: string;
}

type SearchSource = "autocomplete" | "recent" | "popular";
type SearchOption =
  | { kind: "product"; key: string; product: ProductSuggestion }
  | { kind: "term"; key: string; term: string; source: "recent" | "popular" };

const MAX_QUERY_LENGTH = 80;
const POPULAR_SEARCHES = ["silk tie", "wedding", "cufflinks", "gift", "navy"];

export function SearchAutocomplete({
  placeholder = "Search ties, cufflinks, colours, occasions…",
  defaultValue = "",
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue.slice(0, MAX_QUERY_LENGTH));
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listboxId = `${generatedId}-suggestions`;
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fasteno_recent_searches");
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(
          Array.from(
            new Set(
              parsed
                .filter((value): value is string => typeof value === "string")
                .map((value) =>
                  value.normalize("NFKC").trim().slice(0, MAX_QUERY_LENGTH),
                )
                .filter(Boolean),
            ),
          ).slice(0, 5),
        );
      }
    } catch {
      // Storage may be malformed, blocked, or unavailable. Search still works.
    }
  }, []);

  useEffect(() => {
    const normalized = query.normalize("NFKC").trim();
    setSelectedIndex(-1);
    setSearchError(false);
    if (Array.from(normalized).length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      void fetch(
        `/api/search/autocomplete?q=${encodeURIComponent(normalized)}`,
        { signal: controller.signal, cache: "no-store" },
      )
        .then(async (response) => {
          if (!response.ok) throw new Error("Search unavailable");
          const data = (await response.json()) as {
            products?: ProductSuggestion[];
          };
          setSuggestions(Array.isArray(data.products) ? data.products : []);
          setSearchError(false);
        })
        .catch((error: unknown) => {
          if (
            error &&
            typeof error === "object" &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            return;
          }
          setSuggestions([]);
          setSearchError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.normalize("NFKC").trim().slice(0, MAX_QUERY_LENGTH);
    if (!trimmed) return;

    const updated = [
      trimmed,
      ...recentSearches.filter((saved) => saved !== trimmed),
    ].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem(
        "fasteno_recent_searches",
        JSON.stringify(updated),
      );
    } catch {
      // A blocked/full store must not prevent navigation or searching.
    }
  };

  const handleSearch = (term: string, source: SearchSource = "autocomplete") => {
    const normalized = term.normalize("NFKC").trim().slice(0, MAX_QUERY_LENGTH);
    if (!normalized) return;
    saveRecentSearch(normalized);
    const queryLength = Array.from(normalized).length;
    if (source === "autocomplete" && !searchError) {
      trackStorefrontEvent({
        type: "search",
        source,
        queryLength,
        resultCount: suggestions.length,
      });
    } else {
      trackStorefrontEvent({ type: "search", source, queryLength });
    }
    router.push(`/search?q=${encodeURIComponent(normalized)}`);
    setIsOpen(false);
  };

  const chooseProduct = (product: ProductSuggestion, index: number) => {
    trackStorefrontEvent({
      type: "select_item",
      list: "search_suggestions",
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
      },
      index,
    });
    router.push(`/product/${product.slug}`);
    setIsOpen(false);
  };

  const normalizedLength = Array.from(query.trim()).length;
  const recentTerms = recentSearches.map<SearchOption>((term) => ({
    kind: "term",
    key: `recent-${term}`,
    term,
    source: "recent",
  }));
  const recentSet = new Set(recentSearches);
  const popularTerms = POPULAR_SEARCHES.filter(
    (term) => !recentSet.has(term),
  ).map<SearchOption>((term) => ({
    kind: "term",
    key: `popular-${term}`,
    term,
    source: "popular",
  }));
  const options: SearchOption[] =
    normalizedLength >= 2
      ? !isLoading && !searchError
        ? suggestions.map((product) => ({
            kind: "product" as const,
            key: `product-${product.id}`,
            product,
          }))
        : []
      : [...recentTerms, ...popularTerms];
  const showDropdown = isOpen;
  const activeOptionId =
    selectedIndex >= 0 && options[selectedIndex]
      ? `${listboxId}-option-${selectedIndex}`
      : undefined;

  const selectOption = (option: SearchOption, index: number) => {
    if (option.kind === "product") {
      chooseProduct(option.product, index);
    } else {
      handleSearch(option.term, option.source);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedIndex >= 0 && options[selectedIndex]) {
      selectOption(options[selectedIndex], selectedIndex);
    } else {
      handleSearch(query);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      if (options.length === 0) return;
      event.preventDefault();
      setSelectedIndex((previous) =>
        previous < options.length - 1 ? previous + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setSelectedIndex((previous) =>
        previous > 0 ? previous - 1 : options.length - 1,
      );
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative" role="search">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          role="combobox"
          value={query}
          maxLength={MAX_QUERY_LENGTH}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={showDropdown ? activeOptionId : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          autoComplete="off"
          className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-4 text-sm text-ivory shadow-sm placeholder:text-muted/60 transition-[border-color,box-shadow] focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20"
        />
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[500px] overflow-y-auto border border-line bg-card shadow-lg">
          {normalizedLength >= 2 && isLoading && (
            <div
              role="status"
              aria-live="polite"
              className="p-4 text-center text-xs text-muted"
            >
              Searching…
            </div>
          )}
          {normalizedLength >= 2 && !isLoading && searchError && (
            <div
              role="status"
              aria-live="assertive"
              className="p-4 text-center text-xs leading-relaxed text-danger"
            >
              Search suggestions are temporarily unavailable. Press Enter to
              search the collection.
            </div>
          )}
          {normalizedLength >= 2 &&
            !isLoading &&
            !searchError &&
            suggestions.length === 0 && (
              <div
                role="status"
                aria-live="polite"
                className="p-4 text-center text-xs text-muted"
              >
                No matching product suggestions. Press Enter to see all search
                results.
              </div>
            )}
          {options.length > 0 && (
            <div className="px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted">
              {normalizedLength >= 2 ? "Products" : "Suggested searches"}
              <span className="sr-only" role="status" aria-live="polite">
                {options.length} options available.
              </span>
            </div>
          )}

          <div
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            aria-busy={isLoading}
          >
            {options.map((option, index) => (
              <div
                key={option.key}
                id={`${listboxId}-option-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={selectedIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => selectOption(option, index)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink/50 ${
                  selectedIndex === index ? "bg-ink/50" : ""
                }`}
              >
                {option.kind === "product" ? (
                  <>
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden bg-ink">
                      <StorefrontImage
                        src={option.product.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ivory">
                        {option.product.name}
                      </div>
                      {option.product.category && (
                        <div className="text-xs text-muted">
                          {option.product.category}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gold">
                      {formatINR(option.product.price)}
                    </div>
                  </>
                ) : (
                  <>
                    {option.source === "recent" ? (
                      <Clock size={14} aria-hidden className="text-muted" />
                    ) : (
                      <TrendingUp
                        size={14}
                        aria-hidden
                        className="text-muted"
                      />
                    )}
                    <span className="text-sm text-ivory/85">
                      {option.term}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
