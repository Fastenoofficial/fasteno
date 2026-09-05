import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const supabase = await createClient();

  // Search products by name, description, category
  const { data: products } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      price,
      image_url,
      categories (name)
    `)
    .eq("active", true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  // Transform category data
  const transformed = (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image_url: p.image_url,
    category: Array.isArray(p.categories)
      ? p.categories[0]?.name
      : (p.categories as any)?.name || undefined,
  }));

  return NextResponse.json({ products: transformed });
}
