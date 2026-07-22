import type { ProductQuery } from "@/lib/types";

/** URL ⇄ ProductQuery translation shared by the shop, category and search
 *  listings. URL prices are whole rupees (readable/shareable); the data
 *  layer works in paise. */

export type ListingSearchParams = Record<string, string | string[] | undefined>;

export type ListingSort = "featured" | "newest" | "price-asc" | "price-desc";

export interface ListingParams {
  color?: string;
  material?: string;
  pattern?: string;
  /** Minimum price in RUPEES (converted to paise for the query). */
  min?: number;
  /** Maximum price in RUPEES (converted to paise for the query). */
  max?: number;
  /** Occasion / tag filter (homepage links use ?tag= or ?occasion=). */
  tag?: string;
  sort: ListingSort;
}

const SORTS: readonly ListingSort[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
];

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : undefined;
}

function toNumber(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseListingParams(sp: ListingSearchParams): ListingParams {
  const sort = first(sp.sort);
  return {
    color: first(sp.color),
    material: first(sp.material),
    pattern: first(sp.pattern),
    min: toNumber(first(sp.min)),
    max: toNumber(first(sp.max)),
    tag: first(sp.tag) ?? first(sp.occasion),
    sort: SORTS.includes(sort as ListingSort)
      ? (sort as ListingSort)
      : "featured",
  };
}

export function toProductQuery(
  p: ListingParams,
  category?: string,
): ProductQuery {
  return {
    category,
    color: p.color,
    material: p.material,
    pattern: p.pattern,
    tag: p.tag,
    minPrice: p.min !== undefined ? p.min * 100 : undefined,
    maxPrice: p.max !== undefined ? p.max * 100 : undefined,
    sort: p.sort,
  };
}

export function hasActiveFilters(p: ListingParams): boolean {
  return Boolean(
    p.color ||
      p.material ||
      p.pattern ||
      p.tag ||
      p.min !== undefined ||
      p.max !== undefined,
  );
}

/** Serialize back to a query string ("" when everything is default). */
export function serializeListingParams(p: Partial<ListingParams>): string {
  const sp = new URLSearchParams();
  if (p.color) sp.set("color", p.color);
  if (p.material) sp.set("material", p.material);
  if (p.pattern) sp.set("pattern", p.pattern);
  if (p.tag) sp.set("tag", p.tag);
  if (p.min !== undefined) sp.set("min", String(p.min));
  if (p.max !== undefined) sp.set("max", String(p.max));
  if (p.sort && p.sort !== "featured") sp.set("sort", p.sort);
  return sp.toString();
}

export function listingHref(
  basePath: string,
  p: Partial<ListingParams>,
): string {
  const qs = serializeListingParams(p);
  return qs ? `${basePath}?${qs}` : basePath;
}
