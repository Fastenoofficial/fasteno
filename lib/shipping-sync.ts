import "server-only";
import { isShiprocketConfigured } from "@/lib/config";
import type { OrderStatus } from "@/lib/types";

/** Shipment status synchronisation.
 *
 *  One place that turns "what Shiprocket says" into "what our order row
 *  says", used by both the admin's manual refresh button and the cron
 *  poller. Keeping it single-sourced means the delivered-email and
 *  delivered_at rules can't drift between the two callers.
 *
 *  Never throws — shipping status is auxiliary; a courier API outage must
 *  not break the admin panel or fail a cron run. */

export interface ApplyTrackingResult {
  ok: boolean;
  error?: string;
  rawStatus?: string;
  /** The status we moved the order to, or null when unchanged. */
  newStatus?: OrderStatus | null;
}

/** Fetch tracking for one AWB and persist the result onto the order.
 *
 *  Status transitions are deliberately conservative:
 *  - We only ever move an order FORWARD (confirmed → shipped → delivered).
 *    Couriers emit out-of-order scans, and we must not resurrect a delivered
 *    order back to "shipped".
 *  - A cancelled order is never touched — the admin/customer decision wins
 *    over a stale courier scan.
 *  - delivered_at is stamped exactly once, on the first delivered scan. */
export async function applyTrackingToOrder(
  orderId: string,
  awb: string,
): Promise<ApplyTrackingResult> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (!service) return { ok: false, error: "Service role key not set." };

    const { trackByAwb } = await import("@/lib/shiprocket");
    const tracking = await trackByAwb(awb);
    if (!tracking.ok)
      return { ok: false, error: tracking.error ?? "Tracking lookup failed." };

    const { data: current } = await service
      .from("orders")
      .select("status, delivered_at")
      .eq("id", orderId)
      .single();
    const currentStatus = (current as { status?: OrderStatus } | null)?.status;
    const alreadyDeliveredAt = (
      current as { delivered_at?: string | null } | null
    )?.delivered_at;

    const update: Record<string, unknown> = {
      shiprocket_status: tracking.rawStatus ?? null,
      shiprocket_synced_at: new Date().toISOString(),
    };

    const mapped = tracking.status ?? null;
    let newStatus: OrderStatus | null = null;

    // Never override a cancelled order, and never move backwards.
    const canAdvance =
      currentStatus !== "cancelled" &&
      mapped !== null &&
      isForward(currentStatus, mapped);

    if (canAdvance && mapped) {
      update.status = mapped;
      newStatus = mapped;
      if (mapped === "delivered" && !alreadyDeliveredAt) {
        update.delivered_at = tracking.deliveredAt ?? new Date().toISOString();
      }
    }

    const { error } = await service
      .from("orders")
      .update(update)
      .eq("id", orderId);
    if (error) return { ok: false, error: "Could not save the tracking status." };

    // Tell the customer when it lands — once, on the transition into
    // delivered. Awaited: a dropped promise dies when the function freezes.
    if (newStatus === "delivered") {
      await sendDeliveredEmail(orderId);
    }

    return { ok: true, rawStatus: tracking.rawStatus, newStatus };
  } catch (err) {
    console.error("shipping-sync: threw —", (err as Error).message);
    return { ok: false, error: "Could not sync the shipment status." };
  }
}

/** Order-status progression rank. Only forward moves are applied. */
const RANK: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
  cancelled: 99, // terminal, handled separately
};

function isForward(from: OrderStatus | undefined, to: OrderStatus): boolean {
  // A courier reporting RTO/lost cancels regardless of where we were.
  if (to === "cancelled") return true;
  if (!from) return true;
  return RANK[to] > RANK[from];
}

/** "Your order was delivered" email. Reuses the existing sendOrderEmail
 *  pipeline; silently no-ops when no email provider is configured. */
async function sendDeliveredEmail(orderId: string): Promise<void> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (!service) return;

    const { data: row } = await service
      .from("orders")
      .select(
        "id, order_number, user_id, email, phone, shipping_address, subtotal, shipping_fee, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, created_at, courier, awb_number, tracking_url, discount, order_items(id, product_id, name, price, quantity, image)",
      )
      .eq("id", orderId)
      .single();
    if (!row) return;

    const { mapOrderRow } = await import("@/lib/auth");

    const extras = row as {
      courier: string | null;
      awb_number: string | null;
      tracking_url: string | null;
      discount: number | null;
    };
    const order = {
      ...mapOrderRow(row as never),
      courier: extras.courier,
      awbNumber: extras.awb_number,
      trackingUrl: extras.tracking_url,
      discount: extras.discount ?? 0,
    };

    const { sendOrderEmail } = await import("@/lib/email");
    await sendOrderEmail(order as never, "delivered");
  } catch (err) {
    console.error("shipping-sync: delivered email failed —", (err as Error).message);
  }
}

// ── Booking ───────────────────────────────────────────────────────────

export interface BookShipmentResult {
  ok: boolean;
  error?: string;
  awbNumber?: string;
  courier?: string;
  /** Shipment exists at Shiprocket but no courier booked yet — safe to retry
   *  without creating a duplicate parcel. */
  needsAwb?: boolean;
  /** True when the order already had an AWB, so nothing was booked. */
  alreadyBooked?: boolean;
}

/** Book a courier for one order: create the Shiprocket order (unless one
 *  already exists), assign an AWB, then persist courier/AWB/tracking URL and
 *  flip the order to "shipped".
 *
 *  NO AUTH CHECK — this is the internal engine. Callers must authorise:
 *  the admin action wraps it in assertAdmin(); the auto-ship path runs only
 *  from the trusted post-payment hook.
 *
 *  Idempotent: an order with an AWB is never re-booked, and a half-created
 *  shipment is resumed rather than duplicated. Both matter because each
 *  booking costs real money and produces a real parcel. */
export async function bookShipmentForOrder(
  orderId: string,
): Promise<BookShipmentResult> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (!service)
      return { ok: false, error: "Shipping unavailable — service role key not set." };

    const { data: row, error: readError } = await service
      .from("orders")
      .select(
        "id, order_number, user_id, email, phone, shipping_address, subtotal, shipping_fee, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, created_at, awb_number, shiprocket_order_id, shiprocket_shipment_id, order_items(id, product_id, name, price, quantity, image)",
      )
      .eq("id", orderId)
      .single();
    if (readError || !row) return { ok: false, error: "Could not load that order." };

    const extras = row as {
      awb_number: string | null;
      shiprocket_order_id: string | null;
      shiprocket_shipment_id: string | null;
      status: OrderStatus;
    };

    if (extras.awb_number)
      return {
        ok: true,
        alreadyBooked: true,
        awbNumber: extras.awb_number,
        error: undefined,
      };
    if (extras.status === "cancelled")
      return { ok: false, error: "This order is cancelled — it cannot be shipped." };

    const { mapOrderRow } = await import("@/lib/auth");
    const order = mapOrderRow(row as never);

    const { createShipment, assignAwb, trackingUrlForAwb } = await import(
      "@/lib/shiprocket"
    );

    let shipmentId = extras.shiprocket_shipment_id;
    let shiprocketOrderId = extras.shiprocket_order_id;

    if (!shipmentId) {
      const created = await createShipment(order);
      if (!created.ok || !created.shipmentId)
        return { ok: false, error: created.error ?? "Could not create the shipment." };
      shipmentId = created.shipmentId;
      shiprocketOrderId = created.shiprocketOrderId ?? null;

      // Persist BEFORE assigning the AWB: if assignment fails, a retry must
      // resume this shipment instead of creating a second one.
      await service
        .from("orders")
        .update({
          shiprocket_order_id: shiprocketOrderId,
          shiprocket_shipment_id: shipmentId,
          shiprocket_synced_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    const awb = await assignAwb(shipmentId);
    if (!awb.ok || !awb.awbNumber)
      return {
        ok: false,
        needsAwb: true,
        error:
          awb.error ??
          "Shipment created, but no courier could be booked. Try assigning again.",
      };

    const { error: saveError } = await service
      .from("orders")
      .update({
        courier: awb.courier ?? "Shiprocket",
        awb_number: awb.awbNumber,
        tracking_url: awb.trackingUrl ?? trackingUrlForAwb(awb.awbNumber),
        status: "shipped",
        shiprocket_status: "AWB ASSIGNED",
        shiprocket_synced_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (saveError)
      return {
        ok: false,
        error: `Courier booked (AWB ${awb.awbNumber}) but saving it failed. Enter it manually.`,
      };

    // "On its way" email once, only on the actual transition into shipped.
    if (extras.status !== "shipped") {
      await sendShippedEmail(orderId);
    }

    return { ok: true, awbNumber: awb.awbNumber, courier: awb.courier ?? "Shiprocket" };
  } catch (err) {
    console.error("shipping-sync: booking threw —", (err as Error).message);
    return { ok: false, error: "Could not book the shipment." };
  }
}

/** Fire the existing "shipped" email for an order. Never throws. */
async function sendShippedEmail(orderId: string): Promise<void> {
  await sendOrderEmailForOrder(orderId, "shipped");
}

/** Shared loader for the shipped/delivered emails — both need the same
 *  joined row shape plus the 002 tracking columns. */
async function sendOrderEmailForOrder(
  orderId: string,
  kind: "shipped" | "delivered",
): Promise<void> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (!service) return;

    const { data: row } = await service
      .from("orders")
      .select(
        "id, order_number, user_id, email, phone, shipping_address, subtotal, shipping_fee, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, created_at, courier, awb_number, tracking_url, discount, order_items(id, product_id, name, price, quantity, image)",
      )
      .eq("id", orderId)
      .single();
    if (!row) return;

    const { mapOrderRow } = await import("@/lib/auth");
    const extras = row as {
      courier: string | null;
      awb_number: string | null;
      tracking_url: string | null;
      discount: number | null;
    };
    const order = {
      ...mapOrderRow(row as never),
      courier: extras.courier,
      awbNumber: extras.awb_number,
      trackingUrl: extras.tracking_url,
      discount: extras.discount ?? 0,
    };

    const { sendOrderEmail } = await import("@/lib/email");
    await sendOrderEmail(order as never, kind);
  } catch (err) {
    console.error(
      `shipping-sync: ${kind} email failed —`,
      (err as Error).message,
    );
  }
}

/** Auto-book a courier right after payment is confirmed. Opt-in via
 *  SHIPROCKET_AUTO_SHIP=1 and OFF by default: most sellers want to pack and
 *  weigh a parcel before a courier is booked against it, and a booking costs
 *  real money. Never throws — payment confirmation must never fail because
 *  a courier API was down. */
export async function autoShipIfEnabled(orderId: string): Promise<void> {
  if (process.env.SHIPROCKET_AUTO_SHIP !== "1") return;
  if (!isShiprocketConfigured) return;
  try {
    const res = await bookShipmentForOrder(orderId);
    if (!res.ok) {
      console.error(`shiprocket: auto-ship failed for order ${orderId} —`, res.error);
    }
  } catch (err) {
    console.error("shiprocket: auto-ship threw —", (err as Error).message);
  }
}

/** Poll every live shipment and update its status. Used by the cron route.
 *  Bounded so one run can't fan out unboundedly on a busy store. */
export async function syncAllActiveShipments(
  limit = 40,
): Promise<{ checked: number; advanced: number; failed: number }> {
  const empty = { checked: 0, advanced: 0, failed: 0 };
  if (!isShiprocketConfigured) return empty;

  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (!service) return empty;

    // Live shipments only: has an AWB, not yet delivered or cancelled.
    const { data: rows } = await service
      .from("orders")
      .select("id, awb_number")
      .not("awb_number", "is", null)
      .in("status", ["confirmed", "shipped"])
      .order("shiprocket_synced_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    const list = (rows ?? []) as { id: string; awb_number: string }[];
    let advanced = 0;
    let failed = 0;

    // Sequential on purpose: Shiprocket rate-limits aggressively, and this
    // runs on a schedule where latency doesn't matter.
    for (const row of list) {
      const res = await applyTrackingToOrder(row.id, row.awb_number);
      if (!res.ok) failed += 1;
      else if (res.newStatus) advanced += 1;
    }

    return { checked: list.length, advanced, failed };
  } catch (err) {
    console.error("shipping-sync: bulk sync threw —", (err as Error).message);
    return empty;
  }
}
