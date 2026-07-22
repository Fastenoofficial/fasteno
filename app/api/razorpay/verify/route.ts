import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { sendOrderEmail } from "@/lib/email";
import { markOrderPaid } from "@/lib/orders";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export const runtime = "nodejs";

/** POST /api/razorpay/verify
 *  Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *  Verifies HMAC-SHA256(order_id|payment_id, RAZORPAY_KEY_SECRET); on
 *  success marks the matching Supabase order paid. Invalid signature → 400.
 *  Idempotent alongside the webhook: whichever lands first flips the order
 *  (and sends the confirmation email); the other is a no-op. */
export async function POST(request: Request) {
  if (isDemoMode) {
    return NextResponse.json(
      { error: "Payment verification is not available in demo mode." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const razorpayOrderId =
    typeof b.razorpay_order_id === "string" ? b.razorpay_order_id : "";
  const razorpayPaymentId =
    typeof b.razorpay_payment_id === "string" ? b.razorpay_payment_id : "";
  const signature =
    typeof b.razorpay_signature === "string" ? b.razorpay_signature : "";

  if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, signature)) {
    return NextResponse.json(
      { error: "Payment signature verification failed." },
      { status: 400 },
    );
  }

  const { persisted, alreadyPaid, order } = await markOrderPaid(
    razorpayOrderId,
    razorpayPaymentId,
  );
  if (!persisted) {
    // Signature was genuine — the payment happened — but the DB update was
    // blocked (no service-role key + guest session) or found no match.
    console.error(
      "razorpay/verify: signature ok but order not marked paid —",
      razorpayOrderId,
    );
  } else if (!alreadyPaid && order) {
    // This call did the flip → confirmation email exactly once.
    sendOrderEmail(order, "confirmation").catch(() => {});
  }

  return NextResponse.json({ verified: true, persisted });
}
