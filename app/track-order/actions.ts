"use server";

import { headers } from "next/headers";
import { isDemoMode } from "@/lib/config";
import { normalizeOutboundUrl } from "@/lib/image-security";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  total: number;
  courier: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
}

export interface TrackOrderState {
  order: TrackedOrder | null;
  error: string | null;
}

const ORDER_NUMBER_RE = /^FS-\d{4,7}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TRACK_ORDER_MAX_LENGTH = 10;
const TRACK_EMAIL_MAX_LENGTH = 254;
const NOT_FOUND_MESSAGE =
  "No order was found for those details. Check your confirmation email and try again.";

interface TrackRow {
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  created_at: string;
  total: number;
  courier: string | null;
  awb_number: string | null;
  tracking_url: string | null;
}

function limiterError(
  result: Awaited<ReturnType<typeof rateLimit>>,
): TrackOrderState | null {
  if (result.ok) return null;
  return {
    order: null,
    error:
      result.outcome === "unavailable"
        ? RATE_LIMIT_UNAVAILABLE_MESSAGE
        : RATE_LIMIT_MESSAGE,
  };
}

export async function trackOrder(
  _prev: TrackOrderState,
  formData: FormData,
): Promise<TrackOrderState> {
  if (isDemoMode) {
    return {
      order: null,
      error:
        "The store is running in demo mode — demo orders live only in the browser that placed them. Open the order confirmation link from that browser instead.",
    };
  }

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const ipLimit = await rateLimit(rateLimitKey("track-order-ip", ip), {
    limit: 20,
    windowMs: 10 * 60_000,
    mode: "strict",
  });
  const ipError = limiterError(ipLimit);
  if (ipError) return ipError;

  const rawOrder = formData.get("orderNumber");
  const rawEmail = formData.get("email");
  if (typeof rawOrder !== "string" || typeof rawEmail !== "string") {
    return { order: null, error: NOT_FOUND_MESSAGE };
  }
  const orderNumber = rawOrder.normalize("NFKC").trim().toUpperCase();
  const email = rawEmail.normalize("NFKC").trim().toLowerCase();
  if (
    orderNumber.length > TRACK_ORDER_MAX_LENGTH ||
    email.length > TRACK_EMAIL_MAX_LENGTH ||
    !ORDER_NUMBER_RE.test(orderNumber) ||
    !EMAIL_RE.test(email)
  ) {
    return { order: null, error: NOT_FOUND_MESSAGE };
  }

  const targetLimit = await rateLimit(
    rateLimitKey("track-order-target", orderNumber, email),
    { limit: 8, windowMs: 15 * 60_000, mode: "strict" },
  );
  const targetError = limiterError(targetLimit);
  if (targetError) return targetError;

  const service = createServiceClient();
  if (!service) {
    return { order: null, error: RATE_LIMIT_UNAVAILABLE_MESSAGE };
  }

  const { data, error } = await service
    .from("orders")
    .select(
      "order_number, status, payment_status, payment_method, created_at, total, courier, awb_number, tracking_url",
    )
    .is("user_id", null)
    .eq("order_number", orderNumber)
    .eq("email", email)
    .limit(1);
  if (error) {
    console.error("track-order: guest lookup unavailable —", error.message);
    return { order: null, error: RATE_LIMIT_UNAVAILABLE_MESSAGE };
  }

  const row = (data?.[0] as TrackRow | undefined) ?? null;
  if (!row) return { order: null, error: NOT_FOUND_MESSAGE };

  return {
    error: null,
    order: {
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      total: row.total,
      courier: row.courier,
      awbNumber: row.awb_number,
      trackingUrl: normalizeOutboundUrl(row.tracking_url, {
        allowExternal: true,
        optional: true,
      }) || null,
    },
  };
}
