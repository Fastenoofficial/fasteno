"use server";

import { isDemoMode } from "@/lib/config";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

/** Guest order tracking lookup.
 *  Auth model: the order number AND the email on the order must BOTH match —
 *  that pair is the shared secret. Guests cannot SELECT orders under RLS, so
 *  the lookup uses the service-role client and returns only non-sensitive
 *  status fields (never the address or line items). */

export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  total: number; // paise
  courier: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
}

export interface TrackOrderState {
  order: TrackedOrder | null;
  error: string | null;
}

const ORDER_NUMBER_RE = /^FS-\d{4,7}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface TrackRow {
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  created_at: string;
  total: number;
  courier?: string | null;
  awb_number?: string | null;
  tracking_url?: string | null;
}

export async function trackOrder(
  _prev: TrackOrderState,
  formData: FormData,
): Promise<TrackOrderState> {
  const orderNumber = String(formData.get("orderNumber") ?? "")
    .trim()
    .toUpperCase();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    return {
      order: null,
      error: "Please enter a valid order number (e.g. FS-10023).",
    };
  }
  if (!EMAIL_RE.test(email)) {
    return { order: null, error: "Please enter a valid email address." };
  }

  if (isDemoMode) {
    return {
      order: null,
      error:
        "The store is running in demo mode — demo orders live only in the browser that placed them. Open the order confirmation link from that browser instead.",
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let rows: TrackRow[] | null = null;

  if (url && serviceKey) {
    // Service client — bypasses RLS so guest orders are findable. Safe here
    // because both order number and email must match, and we only return
    // status fields.
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .eq("email", email)
      .limit(1);
    if (error) {
      console.error("track-order: lookup failed —", error.message);
      return {
        order: null,
        error: "Could not look up the order right now. Please try again.",
      };
    }
    rows = data as TrackRow[] | null;
  } else {
    // No service key — fall back to the session client (works for signed-in
    // owners and admins; guest rows are invisible under RLS).
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .eq("email", email)
      .limit(1);
    if (error) {
      console.error("track-order: lookup failed —", error.message);
      return {
        order: null,
        error: "Could not look up the order right now. Please try again.",
      };
    }
    rows = data as TrackRow[] | null;
  }

  const row = rows?.[0];
  if (!row) {
    return {
      order: null,
      error:
        "No order found for that order number and email. Check both against your confirmation email and try again.",
    };
  }

  return {
    error: null,
    order: {
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      total: row.total,
      courier: row.courier ?? null,
      awbNumber: row.awb_number ?? null,
      trackingUrl: row.tracking_url ?? null,
    },
  };
}
