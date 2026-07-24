import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import type {
  Address,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Profile,
} from "@/lib/types";
import type { User } from "@supabase/supabase-js";

/** Server-side auth helpers + shared account/admin row mapping.
 *  SERVER ONLY — import from server components, route handlers and
 *  server actions. Every helper is a safe no-op in demo mode. */

// ── Current user / profile ────────────────────────────────────────────

/** The signed-in Supabase user, or null (always null in demo mode). */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Profile row for a user (defaults to the signed-in user). */
export async function getProfile(userId?: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  let id = userId;
  if (!id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    id = user.id;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", id)
    .single();
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    phone: data.phone,
    role: data.role === "admin" ? "admin" : "customer",
  };
}

// ── Safe redirect target ──────────────────────────────────────────────

/** Sanitise a `?next=` redirect target so login/logout can only bounce the
 *  user to a same-origin path. Rejects protocol-relative ("//evil.com"),
 *  backslash ("/\\evil.com") and absolute-URL targets — all of which pass a
 *  naive `startsWith("/")` check and enable an open redirect. */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/account",
): string {
  if (typeof next !== "string") return fallback;
  // Must begin with exactly one "/" and NOT be followed by "/" or "\".
  return /^\/(?![/\\])/.test(next) ? next : fallback;
}

// ── Guards ────────────────────────────────────────────────────────────

/** Redirects to /login when not signed in (live mode). Callers must
 *  handle demo mode themselves BEFORE calling this. */
export async function requireUser(nextPath = "/account"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Admin gate: redirect to /login when signed out, 404 when the user is
 *  not an admin. Callers must handle demo mode BEFORE calling this. */
export async function requireAdmin(): Promise<{
  user: User;
  profile: Profile;
}> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") notFound();
  return { user, profile };
}

// ── Shared order row mapping (account + admin, Supabase live mode) ────

export interface OrderItemRow {
  id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string;
  shipping_address: unknown;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  created_at: string;
  order_items?: OrderItemRow[];
}

function mapShippingAddress(json: unknown): Address {
  const a = (json ?? {}) as Record<string, unknown>;
  return {
    name: String(a.name ?? ""),
    phone: String(a.phone ?? ""),
    line1: String(a.line1 ?? ""),
    line2: a.line2 ? String(a.line2) : undefined,
    city: String(a.city ?? ""),
    state: String(a.state ?? ""),
    pincode: String(a.pincode ?? ""),
  };
}

export function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    email: row.email,
    phone: row.phone,
    shippingAddress: mapShippingAddress(row.shipping_address),
    items: (row.order_items ?? []).map((item) => ({
      productId: item.product_id ?? "",
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    })),
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status as PaymentStatus,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
  };
}
