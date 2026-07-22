import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser, getProfile } from "@/lib/auth";

/** GET /api/admin/export/orders — every order (items summarised as
 *  "2× Name; 1× Name") as a CSV download. Admin role re-verified
 *  server-side; RLS backs it up. */

export const dynamic = "force-dynamic";

/** RFC-4180 escaping + a leading apostrophe on formula-looking cells so
 *  the file is safe to open straight in Excel/Sheets. */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8
}

interface ExportOrderRow {
  id: string;
  order_number: string;
  created_at: string;
  email: string;
  phone: string;
  shipping_address: Record<string, unknown> | null;
  subtotal: number;
  shipping_fee: number;
  discount: number | null;
  coupon_code: string | null;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  courier: string | null;
  awb_number: string | null;
  tracking_url: string | null;
  order_items: { name: string; quantity: number }[] | null;
}

function addressField(row: ExportOrderRow, key: string): string {
  const value = row.shipping_address?.[key];
  return value === null || value === undefined ? "" : String(value);
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
    .from("orders")
    .select(
      "id, order_number, created_at, email, phone, shipping_address, subtotal, shipping_fee, discount, coupon_code, total, payment_method, payment_status, status, razorpay_order_id, razorpay_payment_id, courier, awb_number, tracking_url, order_items(name, quantity)",
    )
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Could not load the orders." },
      { status: 500 },
    );
  }

  const header = [
    "id",
    "order_number",
    "created_at",
    "customer_name",
    "email",
    "phone",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "pincode",
    "items",
    "subtotal_paise",
    "shipping_fee_paise",
    "discount_paise",
    "coupon_code",
    "total_paise",
    "total_inr",
    "payment_method",
    "payment_status",
    "status",
    "razorpay_order_id",
    "razorpay_payment_id",
    "courier",
    "awb_number",
    "tracking_url",
  ];
  const rows = ((data ?? []) as unknown as ExportOrderRow[]).map((o) => [
    o.id,
    o.order_number,
    o.created_at,
    addressField(o, "name"),
    o.email,
    o.phone,
    addressField(o, "line1"),
    addressField(o, "line2"),
    addressField(o, "city"),
    addressField(o, "state"),
    addressField(o, "pincode"),
    (o.order_items ?? [])
      .map((item) => `${item.quantity}× ${item.name}`)
      .join("; "),
    o.subtotal,
    o.shipping_fee,
    o.discount ?? 0,
    o.coupon_code ?? "",
    o.total,
    (o.total / 100).toFixed(2),
    o.payment_method,
    o.payment_status,
    o.status,
    o.razorpay_order_id ?? "",
    o.razorpay_payment_id ?? "",
    o.courier ?? "",
    o.awb_number ?? "",
    o.tracking_url ?? "",
  ]);

  const today = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fasteno-orders-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
