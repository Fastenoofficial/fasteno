"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ProductListing } from "@/components/catalog/ProductListing";
import { parseListingParams, toProductQuery } from "@/components/catalog/query";
import type { Product, Category } from "@/lib/types";

interface ShopClientProps {
  products: Product[];
  options: {
    colors: string[];
    materials: string[];
    patterns: string[];
    maxPrice: number;
  };
  categories: Category[];
}

export default function ShopClient({
  products,
  options,
  categories,
}: ShopClientProps) {
  const searchParams = useSearchParams();

  // Convert searchParams to ListingParams
  const params = useMemo(() => {
    const sp: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      sp[key] = value;
    });
    return parseListingParams(sp);
  }, [searchParams]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    const query = toProductQuery(params);
    let result = [...products];

    if (query.color) result = result.filter((p) => p.color === query.color);
    if (query.material)
      result = result.filter((p) => p.material === query.material);
    if (query.pattern)
      result = result.filter((p) => p.pattern === query.pattern);
    if (query.tag) result = result.filter((p) => p.tags.includes(query.tag!));
    if (typeof query.minPrice === "number")
      result = result.filter((p) => p.price >= query.minPrice!);
    if (typeof query.maxPrice === "number")
      result = result.filter((p) => p.price <= query.maxPrice!);
    if (query.query) {
      const needle = query.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          p.material.toLowerCase().includes(needle) ||
          p.color.toLowerCase().includes(needle) ||
          p.tags.some((t) => t.toLowerCase().includes(needle))
      );
    }

    // Apply sorting
    switch (query.sort) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result = [...result].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "featured":
      default:
        result = [...result].sort(
          (a, b) => Number(b.featured) - Number(a.featured)
        );
    }

    return result;
  }, [products, params]);

  return (
    <ProductListing
      basePath="/shop"
      products={filteredProducts}
      params={params}
      options={options}
    />
  );
}
