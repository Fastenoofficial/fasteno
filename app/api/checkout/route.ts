import { NextResponse } from "next/server";
import { COD_MAX_TOTAL, isDemoMode } from "@/lib/config";
import { sendOrderEmail, sendOwnerOrderAlert } from "@/lib/email";
import { formatINR } from "@/lib/format";
import {
  buildDemoOrder,
  calcTotals,
  createSupabaseOrder,
  decrementStock,
  incrementCouponUsage,
  parseCheckoutPayload,
  priceCartLines,
  restoreStock,
  validateCoupon,
} from "@/lib/orders";
import {
  getRazorpayClient,
  isRazorpayServerConfigured,
  razorpayPublicKeyId,
} from "@/lib/razorpay";
import {
  clientIp,
  rateLimit,
  rateLimitKey,
  RATE_LIMIT_MESSAGE,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
} from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-body";

export const runtime = "nodejs";

/** POST /api/checkout
 *  Body: { items: {productId, quantity}[], contact, address, paymentMethod,
 *          couponCode? }
 *  Prices are ALWAYS recomputed from the catalog server-side, and coupons
 *  are re-validated server-side — the client's discount is never trusted.
 *
 *  Responses:
 *   demo     → { mode: "demo", order }               (client stores fs-orders)
 *   cod      → { mode: "cod", order }                (persisted to Supabase)
 *   razorpay → { mode: "razorpay", order, razorpay } (open widget, then
 *               POST /api/razorpay/verify)
 *   409      → item went out of stock between cart and payment
 *   429      → rate limited (10 req/min/IP)
 */
export async function POST(request: Request) {
  const limited = await rateLimit(rateLimitKey("checkout", clientIp(request)), {
    limit: 10,
    windowMs: 60_000,
    mode: "availability",
  });
  if (!limited.ok) {
    const unavailable = limited.outcome === "unavailable";
    return NextResponse.json(
      { error: unavailable ? RATE_LIMIT_UNAVAILABLE_MESSAGE : RATE_LIMIT_MESSAGE },
      {
        status: unavailable ? 503 : 429,
        headers:
          limited.outcome === "limited"
            ? { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) }
            : undefined,
      },
    );
  }

  const body = await readBoundedJson(request, { maxBytes: 32 * 1024 });
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const parsed = parseCheckoutPayload(body.value);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const payload = parsed.payload;

  // Re-price every line from the catalog — client prices are never trusted.
  const priced = await priceCartLines(payload.items);
  if (!priced.ok) {
    return NextResponse.json({ error: priced.error }, { status: 409 });
  }
  const { items } = priced;
  let totals = priced.totals;

  // ── Coupon: re-validate server-side; a stale/invalid code fails the
  //    request rather than silently charging full price. ────────────────
  let couponCode: string | null = null;
  if (payload.couponCode) {
    const coupon = await validateCoupon(payload.couponCode, totals.subtotal);
    if (!coupon.valid) {
      return NextResponse.json(
        { error: coupon.reason ?? "That coupon code is not valid." },
        { status: 400 },
      );
    }
    couponCode = coupon.code ?? payload.couponCode;
    // free_shipping coupons waive the shipping fee (discount stays 0).
    totals = calcTotals(
      items,
      coupon.discount ?? 0,
      coupon.type === "free_shipping",
    );
  }

  // ── COD guardrail ────────────────────────────────────────────────────
  if (payload.paymentMethod === "cod" && totals.total > COD_MAX_TOTAL) {
    return NextResponse.json(
      {
        error: `Cash on Delivery is available for orders up to ${formatINR(COD_MAX_TOTAL)}. Please pay online for larger orders.`,
      },
      { status: 400 },
    );
  }

  // ── Demo mode: simulated payment, order lives in the browser ────────
  if (isDemoMode) {
    const order = buildDemoOrder(payload, items, totals, couponCode);
    return NextResponse.json({ mode: "demo", order });
  }

  if (payload.paymentMethod === "demo") {
    return NextResponse.json(
      { error: "Demo payment is not available on the live store." },
      { status: 400 },
    );
  }

  // ── Reserve stock atomically before taking any payment. ─────────────
  // Razorpay-widget dismissal has no server signal, so pending razorpay
  // orders keep their reservation (v1); the webhook restores stock on
  // payment.failed. COD decrements and keeps it (order is confirmed).
  const stock = await decrementStock(items);
  if (!stock.ok) {
    if (stock.reason === "out_of_stock") {
      return NextResponse.json(
        {
          error: `"${stock.outOfStockName}" just went out of stock. Please remove it from your cart and try again.`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Inventory reservation is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
  /** Undo the reservation before returning any pre-order failure. */
  const releaseStock = async () => {
    if (stock.reserved) await restoreStock(items);
  };

  // ── COD: persist immediately, payment collected on delivery ─────────
  if (payload.paymentMethod === "cod") {
    const result = await createSupabaseOrder({
      payload,
      items,
      totals,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "confirmed",
      couponCode,
    });
    if (!result.ok) {
      await releaseStock();
      return NextResponse.json(
        { error: result.error },
        { status: result.reason === "service_unavailable" ? 503 : 500 },
      );
    }
    // AWAIT the side effects: on Vercel the function is frozen the moment the
    // response returns, so un-awaited promises are silently dropped — this was
    // the root cause of intermittently missing confirmation emails. All three
    // are guaranteed never to throw.
    await Promise.all([
      couponCode ? incrementCouponUsage(couponCode) : Promise.resolve(),
      sendOrderEmail(result.order, "confirmation"),
      sendOwnerOrderAlert(result.order),
    ]);
    return NextResponse.json({
      mode: "cod",
      order: result.order,
      guestCredential: result.guestCredential,
    });
  }

  // ── Razorpay: gateway order first, then our order referencing it ────
  // (RLS only lets admins UPDATE orders, so razorpay_order_id must be
  //  present at INSERT time rather than patched on afterwards.)
  if (!isRazorpayServerConfigured()) {
    await releaseStock();
    return NextResponse.json(
      { error: "Online payment is not available right now. Please choose Cash on Delivery." },
      { status: 400 },
    );
  }

  let rzpOrderId: string;
  try {
    const razorpay = getRazorpayClient();
    const rzpOrder = await razorpay.orders.create({
      amount: totals.total, // already integer paise
      currency: "INR",
      receipt: `fs_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
      notes: { email: payload.contact.email },
    });
    rzpOrderId = String(rzpOrder.id);
  } catch (err) {
    console.error("checkout: razorpay order creation failed —", err);
    await releaseStock();
    return NextResponse.json(
      { error: "Could not start the payment. Please try again or choose Cash on Delivery." },
      { status: 502 },
    );
  }

  const result = await createSupabaseOrder({
    payload,
    items,
    totals,
    paymentMethod: "razorpay",
    paymentStatus: "pending",
    status: "pending",
    razorpayOrderId: rzpOrderId,
    couponCode,
  });
  if (!result.ok) {
    await releaseStock();
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  // Coupon usage for online orders is counted when the payment is CONFIRMED
  // (markOrderPaid, via the verify route / webhook) — not here — so an
  // abandoned or failed Razorpay checkout never burns a redemption.
  // Confirmation email is likewise sent on capture, not now (still pending).

  return NextResponse.json({
    mode: "razorpay",
    order: result.order,
    guestCredential: result.guestCredential,
    razorpay: {
      keyId: razorpayPublicKeyId(),
      orderId: rzpOrderId,
      amount: totals.total,
      currency: "INR",
      name: payload.address.name,
      email: payload.contact.email,
      phone: payload.contact.phone,
    },
  });
}
