import crypto from "node:crypto";
import Razorpay from "razorpay";

/** Razorpay server helpers. Uses RAZORPAY_KEY_SECRET — import ONLY from
 *  route handlers / server code, never from client components. */

function serverKeyId(): string | undefined {
  return (
    process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  );
}

/** True when both the key id and the secret are available server-side. */
export function isRazorpayServerConfigured(): boolean {
  return Boolean(serverKeyId() && process.env.RAZORPAY_KEY_SECRET);
}

/** The public key id handed to the browser checkout widget. */
export function razorpayPublicKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? serverKeyId() ?? "";
}

/** Instantiate the Razorpay SDK. Throws when keys are missing — guard with
 *  isRazorpayServerConfigured() first. */
export function getRazorpayClient(): Razorpay {
  if (!isRazorpayServerConfigured()) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({
    key_id: serverKeyId()!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

/** Verify the checkout callback signature:
 *  HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET). */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpayOrderId || !razorpayPaymentId || !signature) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  // length check also catches malformed hex (Buffer.from truncates silently)
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify a webhook delivery: x-razorpay-signature is
 *  HMAC-SHA256(raw request body, RAZORPAY_WEBHOOK_SECRET). */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Refunds ───────────────────────────────────────────────────────────

/** Refund a captured Razorpay payment (full when amountPaise is omitted).
 *  Throws on gateway errors — callers surface the message to the admin. */
export async function refundPayment(
  paymentId: string,
  amountPaise?: number,
): Promise<{ refundId: string }> {
  if (!isRazorpayServerConfigured()) {
    throw new Error("Razorpay keys are not configured — cannot refund online payments.");
  }
  const razorpay = getRazorpayClient();
  const refund = await razorpay.payments.refund(paymentId, {
    ...(typeof amountPaise === "number" ? { amount: amountPaise } : {}),
    speed: "normal",
  });
  return { refundId: String(refund.id) };
}

/** Full refund flow for an order (admin action):
 *  1. Load the order via the service-role client (bypasses RLS).
 *  2. razorpay + razorpay_payment_id present → real gateway refund of the
 *     charged total. COD → bookkeeping only (cash returned offline).
 *  3. Set payment_status=refunded, cancel the order, restore stock.
 *  Demo mode / missing service key → clear error. Throws with an
 *  admin-facing message on any failure. */
export async function refundOrder(orderId: string): Promise<{
  refunded: boolean;
  refundId: string | null;
}> {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const service = createServiceClient();
  if (!service) {
    throw new Error(
      "Refunds need the Supabase service-role key (SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  const { data: order, error } = await service
    .from("orders")
    .select("id, total, payment_method, payment_status, razorpay_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the order: ${error.message}`);
  if (!order) throw new Error("Order not found.");
  if (order.payment_status === "refunded") {
    return { refunded: true, refundId: null }; // idempotent
  }
  if (order.payment_status !== "paid" && order.payment_method !== "cod") {
    throw new Error("Only paid orders can be refunded.");
  }

  // Gateway refund for online payments; COD refunds are settled offline.
  let refundId: string | null = null;
  if (order.payment_method === "razorpay") {
    if (!order.razorpay_payment_id) {
      throw new Error("This order has no Razorpay payment id to refund.");
    }
    const result = await refundPayment(
      order.razorpay_payment_id as string,
      order.total as number,
    );
    refundId = result.refundId;
  }

  const { error: updateError } = await service
    .from("orders")
    .update({ payment_status: "refunded", status: "cancelled" })
    .eq("id", order.id);
  if (updateError) {
    // Gateway refund (if any) already went through — surface loudly.
    throw new Error(
      `Refund processed${refundId ? ` (${refundId})` : ""} but the order could not be updated: ${updateError.message}`,
    );
  }

  // Return the stock — best-effort, logged inside restoreStock.
  const { data: itemRows } = await service
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", order.id);
  if (itemRows && itemRows.length > 0) {
    const { error: rpcError } = await service.rpc("restore_stock", {
      items: itemRows,
    });
    if (rpcError) {
      console.error("refund: restore_stock failed —", rpcError.message);
    }
  }

  return { refunded: true, refundId };
}
