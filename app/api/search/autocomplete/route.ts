import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";
import { isDemoMode } from "@/lib/config";
import { normalizeImageSource } from "@/lib/image-security";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;
const FILTER_WILDCARD_RE = /[%_\u0000-\u001f\u007f]/u;

interface SearchRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

function responseProduct(row: SearchRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    imageUrl: normalizeImageSource(row.image_url),
    category: row.category,
  };
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(
    rateLimitKey("autocomplete", clientIp(request)),
    { limit: 60, windowMs: 60_000, mode: "availability" },
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE, products: [] },
      {
        status: 429,
        headers:
          limited.outcome === "limited"
            ? { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1_000)) }
            : undefined,
      },
    );
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "")
    .normalize("NFKC")
    .trim();
  const length = Array.from(query).length;
  if (length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ products: [] });
  }
  if (length > MAX_QUERY_LENGTH || FILTER_WILDCARD_RE.test(query)) {
    return NextResponse.json(
      { error: "Enter a search between 2 and 80 characters.", products: [] },
      { status: 400 },
    );
  }

  if (isDemoMode) {
    const products = await getProducts({ query, sort: "featured", limit: 6 });
    return NextResponse.json({
      products: products.map((product) =>
        responseProduct({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          image_url: product.images[0] ?? null,
          category: product.category,
        }),
      ),
    });
  }

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase.rpc("search_product_autocomplete", {
      p_query: query,
      p_limit: 6,
    });
    if (error) {
      console.error("autocomplete: database search failed —", error.message);
      return NextResponse.json(
        { error: "Search is temporarily unavailable.", products: [] },
        { status: 503 },
      );
    }
    const rows = Array.isArray(data) ? (data as SearchRow[]).slice(0, 6) : [];
    return NextResponse.json(
      { products: rows.map(responseProduct) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error(
      "autocomplete: search unavailable —",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Search is temporarily unavailable.", products: [] },
      { status: 503 },
    );
  }
}
