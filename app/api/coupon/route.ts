import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/orders";
import { readBoundedJson } from "@/lib/request-body";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

/** POST /api/coupon
 *  Body: { code: string, subtotal: number }  (subtotal in integer paise)
 *  → { valid: boolean, discount?: number, code?: string, reason?: string }
 *
 *  Preview endpoint for the checkout UI. The discount returned here is
 *  advisory only — /api/checkout re-validates the code server-side before
 *  charging, so a tampered subtotal can't buy a bigger discount.
 *  Demo mode: hardcoded WELCOME10 (10% off, cap ₹500, min ₹999).
 *  Rate limited: 20 req/min/IP.
 */
export async function POST(request: Request) {
  const limited = await rateLimit(
    rateLimitKey("coupon", clientIp(request)),
    { limit: 20, windowMs: 60_000 },
  );
  if (!limited.ok) {
    return NextResponse.json(
      { valid: false, reason: RATE_LIMIT_MESSAGE },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) },
      },
    );
  }

  const parsed = await readBoundedJson(request, { maxBytes: 2_048 });
  if (!parsed.ok) {
    return NextResponse.json(
      {
        valid: false,
        reason: parsed.status === 400 ? "Invalid request." : parsed.error,
      },
      { status: parsed.status },
    );
  }

  const b = (parsed.value ?? {}) as Record<string, unknown>;
  const code = typeof b.code === "string" ? b.code.trim() : "";
  const subtotal = Number(b.subtotal);

  if (!code || code.length > 40) {
    return NextResponse.json(
      { valid: false, reason: "Enter a coupon code." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(subtotal) || subtotal < 0 || subtotal > 100_000_000) {
    return NextResponse.json(
      { valid: false, reason: "Invalid order subtotal." },
      { status: 400 },
    );
  }

  const result = await validateCoupon(code, subtotal);
  return NextResponse.json(result);
}
