import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { sendOrderEmail } from "@/lib/email";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

/** POST /api/razorpay/webhook — Razorpay server-to-server events.
 *
 *  Configure in the Razorpay dashboard (Settings → Webhooks) pointing at
 *  https://<site>/api/razorpay/webhook with the payment.captured and
 *  payment.failed events, and set the same secret in RAZORPAY_WEBHOOK_SECRET.
 *
 *  Signature: x-razorpay-signature = HMAC-SHA256(raw body, webhook secret)
 *  — verified against the RAW body before parsing.
 *
 *  payment.captured → mark the order paid (idempotent: already-paid orders
 *  are skipped, so this coexists with the client-initiated /verify flow).
 *  payment.failed   → payment_status=failed + restore reserved stock
 *  (idempotent: only pending orders flip).
 *
 *  Always answers 200 for verified deliveries — Razorpay retries non-2xx,
 *  and our handlers are safe to re-run anyway. */
export async function POST(request: Request) {
  if (isDemoMode) {
    // No Supabase → nothing to update; acknowledge so test pings succeed.
    return NextResponse.json({ ok: true, skipped: "demo-mode" });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("webhook: RAZORPAY_WEBHOOK_SECRET is not set — rejecting.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { event?: string; payload?: unknown };
  try {
    event = JSON.parse(rawBody) as { event?: string; payload?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payment = (
    (event.payload as { payment?: { entity?: Record<string, unknown> } } | undefined)
      ?.payment?.entity ?? {}
  ) as Record<string, unknown>;
  const razorpayOrderId =
    typeof payment.order_id === "string" ? payment.order_id : "";
  const razorpayPaymentId = typeof payment.id === "string" ? payment.id : "";

  switch (event.event) {
    case "payment.captured": {
      if (!razorpayOrderId || !razorpayPaymentId) break;
      // payment.entity.amount is the authentic captured amount (paise) —
      // pass it so markOrderPaid can refuse an amount mismatch.
      const capturedAmount =
        typeof payment.amount === "number" ? payment.amount : undefined;
      const { persisted, alreadyPaid, order } = await markOrderPaid(
        razorpayOrderId,
        razorpayPaymentId,
        { capturedAmount },
      );
      if (!persisted) {
        console.error(
          "webhook: payment.captured but no matching order —",
          razorpayOrderId,
        );
      } else if (!alreadyPaid && order) {
        // This delivery did the flip → send the confirmation exactly once.
        sendOrderEmail(order, "confirmation").catch(() => {});
      }
      break;
    }
    case "payment.failed": {
      if (!razorpayOrderId) break;
      await markOrderPaymentFailed(razorpayOrderId);
      break;
    }
    default:
      // Unsubscribed/unknown event — acknowledge and ignore.
      break;
  }

  return NextResponse.json({ ok: true });
}
