"use client";

import { useEffect, useRef, useState } from "react";
import { Search, TrendingUp, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  category?: string;
}

interface SearchAutocompleteProps {
  placeholder?: string;
  defaultValue?: string;
}

export function SearchAutocomplete({
  placeholder = "Search ties, cufflinks, colours, occasions…",
  defaultValue = ""
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [popularSearches] = useState(["silk tie", "wedding", "cufflinks", "gift", "navy"]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("fasteno_recent_searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.products || []);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("fasteno_recent_searches", JSON.stringify(updated));
  };

  const handleSearch = (term: string) => {
    saveRecentSearch(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = suggestions.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        router.push(`/product/${suggestions[selectedIndex].slug}`);
        setIsOpen(false);
      } else if (query.trim()) {
        handleSearch(query);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && (query.length >= 2 || recentSearches.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search products"
          autoComplete="off"
          className="w-full border border-line bg-card py-3 pl-11 pr-4 text-sm text-ivory placeholder:text-muted/60 transition-colors focus:border-gold/70 focus:outline-none"
        />
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 border border-line bg-card shadow-lg max-h-[500px] overflow-y-auto z-50">
          {/* Loading state */}
          {isLoading && query.length >= 2 && (
            <div className="p-4 text-center text-xs text-muted">
              Searching...
            </div>
          )}

          {/* Product suggestions */}
          {!isLoading && suggestions.length > 0 && (
            <div className="border-b border-line">
              <div className="px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted">
                Products
              </div>
              {suggestions.map((product, idx) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    router.push(`/product/${product.slug}`);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink/50 ${
                    selectedIndex === idx ? "bg-ink/50" : ""
                  }`}
                >
                  <div className="relative h-12 w-12 flex-shrink-0 bg-ink">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ivory truncate">{product.name}</div>
                    {product.category && (
                      <div className="text-xs text-muted">{product.category}</div>
                    )}
                  </div>
                  <div className="text-sm text-gold font-semibold">
                    ₹{product.price.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && query.length >= 2 && suggestions.length === 0 && (
            <div className="p-4 text-center text-xs text-muted">
              No products found for "{query}"
            </div>
          )}

          {/* Recent searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="border-b border-line">
              <div className="px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted flex items-center gap-2">
                <Clock size={10} />
                Recent Searches
              </div>
              {recentSearches.map((term, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearch(term)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ivory/85 transition-colors hover:bg-ink/50 hover:text-gold"
                >
                  <Clock size={14} className="text-muted" />
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Popular searches */}
          {query.length < 2 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-muted flex items-center gap-2">
                <TrendingUp size={10} />
                Popular Searches
              </div>
              {popularSearches.map((term, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearch(term)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-ivory/85 transition-colors hover:bg-ink/50 hover:text-gold"
                >
                  <TrendingUp size={14} className="text-muted" />
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
