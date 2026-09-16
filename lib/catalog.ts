import { isSupabaseConfigured } from "@/lib/config";
import { normalizeImageSource } from "@/lib/image-security";
import { seedCategories, seedProducts } from "@/lib/seed-data";
import type { Category, Product, ProductQuery } from "@/lib/types";

/** Catalog data layer (server-side).
 *  Live mode → Supabase `products`/`categories`; demo mode → bundled seed.
 *  Every feature area reads the catalog through these functions only. */

// ── Row mapping (Supabase snake_case → domain camelCase) ──────────────

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category_slug: string;
  price: number;
  compare_at_price: number | null;
  description: string;
  details: string[] | null;
  material: string;
  color: string;
  pattern: string;
  tags: string[] | null;
  images: string[] | null;
  stock: number;
  featured: boolean;
  featured_order?: number | null;
  active: boolean;
  created_at: string;
  /** SEO overrides (migration 003) — optional so older selects still map. */
  meta_title?: string | null;
  meta_description?: string | null;
}

export function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category_slug as Product["category"],
    price: row.price,
    compareAtPrice: row.compare_at_price,
    description: row.description,
    details: row.details ?? [],
    material: row.material,
    color: row.color,
    pattern: row.pattern as Product["pattern"],
    tags: row.tags ?? [],
    images: (row.images ?? [])
      .map((image) => normalizeImageSource(image))
      .filter((image): image is string => image !== null),
    stock: row.stock,
    featured: row.featured,
    featuredOrder: row.featured_order ?? 0,
    active: row.active,
    createdAt: row.created_at,
    metaTitle: row.meta_title || undefined,
    metaDescription: row.meta_description || undefined,
  };
}

// ── Internal fetch-all with per-request memoisation ───────────────────

async function fetchAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return seedProducts;
  const { createPublicClient } = await import("@/lib/supabase/server");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, description, details, material, color, pattern, tags, images, stock, featured, featured_order, active, created_at, meta_title, meta_description, category_slug:categories!inner(slug)",
    )
    .eq("active", true);
  if (error || !data) {
    // LIVE mode must never fall back to bundled seed data: the seed rows have
    // demo prices, demo stock and ids that don't exist in the database, so
    // they would show phantom products a customer cannot actually buy (and at
    // the wrong price). Fail closed through the route error boundary instead
    // of quietly selling fiction or presenting a false empty collection.
    console.error(
      "catalog: products query failed in LIVE mode —",
      error?.message ?? "no data returned",
    );
    throw new Error("The product catalog is temporarily unavailable.");
  }
  return (data as unknown[]).map((raw) => {
    const row = raw as Omit<ProductRow, "category_slug"> & {
      category_slug: { slug: string } | { slug: string }[];
    };
    const cat = Array.isArray(row.category_slug)
      ? row.category_slug[0]?.slug
      : row.category_slug?.slug;
    return mapProductRow({ ...row, category_slug: cat ?? "ties" });
  });
}

// ── Public API ────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured) return seedCategories;
  const { createPublicClient } = await import("@/lib/supabase/server");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, slug, name, description, sort_order, image_url, display_on_home",
    )
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  // Same reasoning as fetchAllProducts: no seed fallback in live mode.
  if (error || !data) {
    console.error(
      "catalog: categories query failed in LIVE mode —",
      error?.message ?? "no data returned",
    );
    throw new Error("The product categories are temporarily unavailable.");
  }
  return data.map((category) => ({
    id: category.id,
    slug: category.slug as Category["slug"],
    name: category.name,
    description: category.description ?? "",
    sortOrder: category.sort_order,
    image_url: normalizeImageSource(category.image_url) ?? undefined,
    display_on_home: category.display_on_home ?? true,
  }));
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getProducts(q: ProductQuery = {}): Promise<Product[]> {
  let products = (await fetchAllProducts()).filter((p) => p.active);

  if (q.category) products = products.filter((p) => p.category === q.category);
  if (q.color) products = products.filter((p) => p.color === q.color);
  if (q.material)
    products = products.filter((p) => p.material === q.material);
  if (q.pattern) products = products.filter((p) => p.pattern === q.pattern);
  if (q.tag) products = products.filter((p) => p.tags.includes(q.tag!));
  if (typeof q.minPrice === "number")
    products = products.filter((p) => p.price >= q.minPrice!);
  if (typeof q.maxPrice === "number")
    products = products.filter((p) => p.price <= q.maxPrice!);
  if (q.query) {
    const needle = q.query.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.material.toLowerCase().includes(needle) ||
        p.color.toLowerCase().includes(needle) ||
        p.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }

  switch (q.sort) {
    case "price-asc":
      products = [...products].sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      products = [...products].sort((a, b) => b.price - a.price);
      break;
    case "newest":
      products = [...products].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case "featured":
    default:
      // Keep the established general shop sort: featured membership first,
      // with equal rows retaining the catalog's incoming order.
      products = [...products].sort(
        (a, b) => Number(b.featured) - Number(a.featured),
      );
  }

  if (q.limit) products = products.slice(0, q.limit);
  return products;
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | null> {
  const products = await fetchAllProducts();
  return products.find((p) => p.slug === slug && p.active) ?? null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const products = await fetchAllProducts();
  return products.filter((p) => ids.includes(p.id));
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    // Demo mode intentionally follows the authored seed-array order.
    return seedProducts
      .filter((product) => product.active && product.featured)
      .slice(0, limit);
  }

  const products = await fetchAllProducts();
  return products
    .filter((product) => product.active && product.featured)
    .sort(
      (a, b) =>
        (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}

/** Same category first, then shared tags — excludes the product itself. */
export async function getRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const all = (await fetchAllProducts()).filter(
    (p) => p.active && p.id !== product.id,
  );
  const scored = all
    .map((p) => {
      let score = 0;
      if (p.category === product.category) score += 2;
      score += p.tags.filter((t) => product.tags.includes(t)).length;
      if (p.color === product.color) score += 1;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
}

/** Distinct filter options derived from the (optionally pre-filtered) set. */
export async function getFilterOptions(category?: string) {
  const products = await getProducts(category ? { category } : {});
  const uniq = (values: string[]) => Array.from(new Set(values)).sort();
  return {
    colors: uniq(products.map((p) => p.color)),
    materials: uniq(products.map((p) => p.material)),
    patterns: uniq(products.map((p) => p.pattern)),
    maxPrice: products.reduce((m, p) => Math.max(m, p.price), 0),
  };
}

/** All active products — used for static generation at build time. */
export async function getAllProducts(): Promise<Product[]> {
  return (await fetchAllProducts()).filter((p) => p.active);
}
