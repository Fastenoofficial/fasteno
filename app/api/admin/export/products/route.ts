import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser, getProfile } from "@/lib/auth";

/** GET /api/admin/export/products — full catalog (incl. archived) as a
 *  CSV download. Admin role re-verified server-side; RLS backs it up. */

export const dynamic = "force-dynamic";

/** RFC-4180 escaping + a leading apostrophe on formula-looking cells so
 *  the file is safe to open straight in Excel/Sheets. */
function csvCell(value: unknown): string {
  let s =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join(" | ")
        : String(value);
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8 (₹, ×)
}

interface ExportProductRow {
  id: string;
  slug: string;
  name: string;
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
  active: boolean;
  country_of_origin: string | null;
  hsn_code: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  categories: { slug: string } | { slug: string }[] | null;
}

function categorySlug(row: ExportProductRow): string {
  if (!row.categories) return "";
  return Array.isArray(row.categories)
    ? (row.categories[0]?.slug ?? "")
    : row.categories.slug;
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Exports need a connected Supabase project (demo mode)." },
      { status: 503 },
    );
  }

  // Never trust the client — re-verify the session AND the admin role.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, price, compare_at_price, description, details, material, color, pattern, tags, images, stock, featured, active, country_of_origin, hsn_code, meta_title, meta_description, created_at, categories(slug)",
    )
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Could not load the products." },
      { status: 500 },
    );
  }

  const header = [
    "id",
    "slug",
    "name",
    "category",
    "price_paise",
    "price_inr",
    "compare_at_price_paise",
    "description",
    "details",
    "material",
    "color",
    "pattern",
    "tags",
    "images",
    "stock",
    "featured",
    "active",
    "country_of_origin",
    "hsn_code",
    "meta_title",
    "meta_description",
    "created_at",
  ];
  const rows = ((data ?? []) as ExportProductRow[]).map((p) => [
    p.id,
    p.slug,
    p.name,
    categorySlug(p),
    p.price,
    (p.price / 100).toFixed(2),
    p.compare_at_price,
    p.description,
    p.details,
    p.material,
    p.color,
    p.pattern,
    p.tags,
    p.images,
    p.stock,
    p.featured,
    p.active,
    p.country_of_origin ?? "India",
    p.hsn_code ?? "",
    p.meta_title ?? "",
    p.meta_description ?? "",
    p.created_at,
  ]);

  const today = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fasteno-products-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
