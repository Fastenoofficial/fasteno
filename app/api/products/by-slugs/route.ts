import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUGS = 8;

/** GET /api/products/by-slugs?slugs=a,b,c
 *  → { products: Product[] } — active catalog products for up to 8 slugs,
 *  returned in the order requested (unknown slugs are skipped).
 *  Public, cacheable — powers the client-side "Recently viewed" rail. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("slugs") ?? "";

  const slugs = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0 && s.length <= 80 && SLUG_RE.test(s)),
    ),
  ).slice(0, MAX_SLUGS);

  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  };

  if (slugs.length === 0) {
    return NextResponse.json({ products: [] }, { headers });
  }

  const all = await getProducts({});
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const products = slugs.flatMap((slug) => {
    const product = bySlug.get(slug);
    return product ? [product] : [];
  });

  return NextResponse.json({ products }, { headers });
}
