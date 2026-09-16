import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { sendOrderEmail, sendOwnerOrderAlert } from "@/lib/email";
import { markOrderPaid } from "@/lib/orders";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-body";

export const runtime = "nodejs";

const ORDER_ID_RE = /^order_[A-Za-z0-9]{6,40}$/;
const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]{6,40}$/;
const SIGNATURE_RE = /^[0-9a-f]{64}$/i;

/** Verify a browser callback, then persist capture state authoritatively. */
export async function POST(request: Request) {
  if (isDemoMode) {
    return NextResponse.json(
      { error: "Payment verification is not available in demo mode." },
      { status: 400 },
    );
  }

  const body = await readBoundedJson<Record<string, unknown>>(request, {
    maxBytes: 2 * 1024,
  });
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const razorpayOrderId =
    typeof body.value.razorpay_order_id === "string"
      ? body.value.razorpay_order_id.trim()
      : "";
  const razorpayPaymentId =
    typeof body.value.razorpay_payment_id === "string"
      ? body.value.razorpay_payment_id.trim()
      : "";
  const signature =
    typeof body.value.razorpay_signature === "string"
      ? body.value.razorpay_signature.trim()
      : "";

  const limited = await rateLimit(
    rateLimitKey("razorpay-verify", clientIp(request), razorpayOrderId),
    { limit: 20, windowMs: 5 * 60_000, mode: "strict" },
  );
  if (!limited.ok) {
    const unavailable = limited.outcome === "unavailable";
    return NextResponse.json(
      { error: unavailable ? RATE_LIMIT_UNAVAILABLE_MESSAGE : RATE_LIMIT_MESSAGE },
      {
        status: unavailable ? 503 : 429,
        headers:
          limited.outcome === "limited"
            ? { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1_000)) }
            : undefined,
      },
    );
  }

  if (
    !ORDER_ID_RE.test(razorpayOrderId) ||
    !PAYMENT_ID_RE.test(razorpayPaymentId) ||
    !SIGNATURE_RE.test(signature) ||
    !verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, signature)
  ) {
    return NextResponse.json(
      { error: "Payment signature verification failed." },
      { status: 400 },
    );
  }

  const { persisted, alreadyPaid, order, reason } = await markOrderPaid(
    razorpayOrderId,
    razorpayPaymentId,
  );
  if (!persisted) {
    const permanent =
      reason === "amount_mismatch" ||
      reason === "payment_id_mismatch" ||
      reason === "payment_id_conflict" ||
      reason === "order_cancelled" ||
      reason === "invalid_state" ||
      reason === "items_missing" ||
      reason === "out_of_stock";
    return NextResponse.json(
      {
        verified: true,
        persisted: false,
        reason: reason ?? "update_error",
        error:
          "Your payment was received, but order confirmation requires reconciliation. Please contact support before trying another payment.",
      },
      { status: permanent ? 409 : 503 },
    );
  }

  if (!alreadyPaid && order) {
    await Promise.all([
      sendOrderEmail(order, "confirmation"),
      sendOwnerOrderAlert(order),
    ]);
  }
  return NextResponse.json({ verified: true, persisted: true });
}
