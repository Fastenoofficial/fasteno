import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { sendOrderEmail, sendOwnerOrderAlert } from "@/lib/email";
import { markOrderPaid, markOrderPaymentFailed } from "@/lib/orders";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { readBoundedBytes } from "@/lib/request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RazorpayEvent {
  event?: unknown;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
  };
}

function webhookJson(
  body: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** Verified Razorpay callback. HMAC always covers the exact received bytes. */
export async function POST(request: Request) {
  const body = await readBoundedBytes(request, {
    maxBytes: 256 * 1024,
    allowedContentTypes: ["application/json"],
    contentTypeError: "Expected application/json.",
  });
  if (!body.ok) {
    return webhookJson({ error: body.error }, { status: body.status });
  }

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.error("webhook: RAZORPAY_WEBHOOK_SECRET is not set — rejecting.");
    return webhookJson({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("x-razorpay-signature")?.trim() ?? "";
  if (!verifyRazorpayWebhookSignature(body.value, signature)) {
    return webhookJson({ error: "Invalid signature." }, { status: 400 });
  }

  if (isDemoMode) {
    return webhookJson({ ok: true, skipped: "demo-mode" });
  }

  let event: RazorpayEvent;
  try {
    const rawText = new TextDecoder("utf-8", { fatal: true }).decode(body.value);
    event = JSON.parse(rawText) as RazorpayEvent;
  } catch {
    return webhookJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  const eventName = typeof event.event === "string" ? event.event : "";
  const payment = event.payload?.payment?.entity ?? {};
  const razorpayOrderId =
    typeof payment.order_id === "string" ? payment.order_id.trim() : "";
  const razorpayPaymentId =
    typeof payment.id === "string" ? payment.id.trim() : "";
  const validOrderId = /^order_[A-Za-z0-9]{6,40}$/.test(razorpayOrderId);

  if (eventName === "payment.captured") {
    if (!validOrderId || !/^pay_[A-Za-z0-9]{6,40}$/.test(razorpayPaymentId)) {
      return webhookJson({ error: "Invalid payment event." }, { status: 400 });
    }
    const capturedAmount =
      typeof payment.amount === "number" &&
      Number.isSafeInteger(payment.amount) &&
      payment.amount >= 0
        ? payment.amount
        : undefined;
    if (capturedAmount === undefined) {
      return webhookJson({ error: "Invalid payment event." }, { status: 400 });
    }

    const { persisted, alreadyPaid, order, reason } = await markOrderPaid(
      razorpayOrderId,
      razorpayPaymentId,
      { capturedAmount },
    );
    if (!persisted) {
      console.error(`webhook: payment.captured not persisted (${reason ?? "unknown"}).`);
      const permanent =
        reason === "amount_mismatch" ||
        reason === "payment_id_mismatch" ||
        reason === "payment_id_conflict" ||
        reason === "order_cancelled" ||
        reason === "invalid_state" ||
        reason === "items_missing" ||
        reason === "out_of_stock";
      if (!permanent) {
        return webhookJson(
          { error: "Order update failed — please retry." },
          { status: 500 },
        );
      }
    } else if (!alreadyPaid && order) {
      await Promise.all([
        sendOrderEmail(order, "confirmation"),
        sendOwnerOrderAlert(order),
      ]);
    }
  } else if (eventName === "payment.failed") {
    if (!validOrderId) {
      return webhookJson({ error: "Invalid payment event." }, { status: 400 });
    }
    const failed = await markOrderPaymentFailed(razorpayOrderId);
    if (!failed.handled) {
      console.error(`webhook: payment.failed not persisted (${failed.reason ?? "unknown"}).`);
      return webhookJson(
        { error: "Order update failed — please retry." },
        { status: 500 },
      );
    }
  }

  return webhookJson({ ok: true });
}
