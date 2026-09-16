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
}: ShopClientProps) {
  const searchParams = useSearchParams();

  const params = useMemo(() => {
    const values: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      values[key] = value;
    });
    return parseListingParams(values);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    const query = toProductQuery(params);
    let result = [...products];

    if (query.color) result = result.filter((product) => product.color === query.color);
    if (query.material) {
      result = result.filter((product) => product.material === query.material);
    }
    if (query.pattern) {
      result = result.filter((product) => product.pattern === query.pattern);
    }
    if (query.tag) {
      result = result.filter((product) => product.tags.includes(query.tag!));
    }
    if (typeof query.minPrice === "number") {
      result = result.filter((product) => product.price >= query.minPrice!);
    }
    if (typeof query.maxPrice === "number") {
      result = result.filter((product) => product.price <= query.maxPrice!);
    }
    if (query.query) {
      const needle = query.query.toLowerCase();
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.description.toLowerCase().includes(needle) ||
          product.material.toLowerCase().includes(needle) ||
          product.color.toLowerCase().includes(needle) ||
          product.tags.some((tag) => tag.toLowerCase().includes(needle)),
      );
    }

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
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "featured":
      default:
        result = [...result].sort(
          (a, b) => Number(b.featured) - Number(a.featured),
        );
    }

    return result;
  }, [products, params]);

  return (
    <ProductListing
      basePath="/shop"
      listContext="shop_all"
      products={filteredProducts}
      params={params}
      options={options}
    />
  );
}
