"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { getProfile, mapOrderRow, type OrderRow } from "@/lib/auth";
import type { OrderStatus, PaymentStatus, Pattern } from "@/lib/types";

/** Admin server actions. Each one re-verifies the admin role server-side
 *  (RLS enforces it in the database too — this gives clean error messages). */

export interface AdminActionResult {
  error?: string;
  ok?: boolean;
  /** id of the created/updated product (for redirect after create) */
  id?: string;
}

async function assertAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured) return "Admin is disabled in demo mode.";
  const profile = await getProfile();
  if (!profile || profile.role !== "admin")
    return "You need admin access for this.";
  return null;
}

// ── Products ──────────────────────────────────────────────────────────

export interface ProductFormInput {
  slug: string;
  name: string;
  categorySlug: string;
  /** paise */
  price: number;
  /** paise, null = not on sale */
  compareAtPrice: number | null;
  description: string;
  details: string[];
  material: string;
  color: string;
  pattern: Pattern;
  tags: string[];
  images: string[];
  stock: number;
  featured: boolean;
  active: boolean;
  /** Legal Metrology compliance — defaults to India. */
  countryOfOrigin: string;
  /** HSN code for GST invoices, optional (e.g. "6215" for ties). */
  hsnCode: string;
  /** SEO <title> override — empty = fall back to the product name. */
  metaTitle: string;
  /** SEO meta description — empty = fall back to the description. */
  metaDescription: string;
}

function validateProduct(p: ProductFormInput): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))
    return "Slug must be lowercase words separated by hyphens.";
  if (!p.name.trim()) return "Please enter a product name.";
  if (!p.categorySlug) return "Please choose a category.";
  if (!Number.isInteger(p.price) || p.price <= 0)
    return "Please enter a valid price.";
  if (
    p.compareAtPrice !== null &&
    (!Number.isInteger(p.compareAtPrice) || p.compareAtPrice <= p.price)
  )
    return "Compare-at price must be higher than the selling price.";
  if (!p.material.trim()) return "Please enter the material.";
  if (!p.color.trim()) return "Please enter the primary colour.";
  if (!Number.isInteger(p.stock) || p.stock < 0)
    return "Stock must be zero or more.";
  if (p.featured && !p.active)
    return "A featured product must also be active.";
  if (p.images.length === 0) return "Add at least one image path.";
  return null;
}

function revalidateProductCatalog(id: string, ...slugs: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/featured");
  revalidatePath("/admin/activity");
  revalidatePath("/shop");
  revalidatePath("/");
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/product/${slug}`);
  }
}

export async function saveProduct(
  input: ProductFormInput,
  id?: string,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  if (!Array.isArray(input.images) || input.images.length === 0) {
    return { error: "Add at least one image path." };
  }
  const { normalizeImageSources } = await import("@/lib/image-security");
  const normalizedImages = normalizeImageSources(input.images);
  if (!normalizedImages) {
    return {
      error:
        "Use 1 to 12 valid local image paths or approved HTTPS image URLs.",
    };
  }

  const invalid = validateProduct(input);
  if (invalid) return { error: invalid };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // category slug → id
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", input.categorySlug)
    .single();
  if (!category) return { error: "Unknown category." };

  // Descriptive, pricing, stock, media, and SEO fields use the ordinary admin
  // update. Category/active/featured fields are applied by one locked RPC below
  // so their operational history and ordering changes are atomic.
  const row = {
    slug: input.slug.trim(),
    name: input.name.trim(),
    price: input.price,
    compare_at_price: input.compareAtPrice,
    description: input.description.trim(),
    details: input.details.map((d) => d.trim()).filter(Boolean),
    material: input.material.trim().toLowerCase(),
    color: input.color.trim().toLowerCase(),
    pattern: input.pattern,
    tags: input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    images: normalizedImages,
    stock: input.stock,
    country_of_origin: input.countryOfOrigin.trim() || "India",
    hsn_code: input.hsnCode.trim(),
    meta_title: input.metaTitle.trim(),
    meta_description: input.metaDescription.trim(),
  };

  if (id) {
    const { data: current, error: currentError } = await supabase
      .from("products")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (currentError || !current) {
      return { error: "Could not load the product before saving." };
    }

    const { data: updated, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !updated) {
      return {
        error:
          error?.code === "23505"
            ? "That slug is already in use."
            : "Could not save the product.",
      };
    }

    const { data: stateRows, error: stateError } = await supabase.rpc(
      "admin_set_product_editor_state",
      {
        p_product_id: id,
        p_category_id: category.id,
        p_active: input.active,
        p_featured: input.featured,
      },
    );
    if (stateError || !((stateRows ?? []) as unknown[]).length) {
      return {
        error:
          "Product details were saved, but its category or publication state could not be updated.",
      };
    }

    revalidateProductCatalog(id, current.slug, input.slug.trim());
    return { ok: true, id };
  }

  // Create a safe draft first. Migration 010 requires every authenticated
  // product insert to be inactive/unfeatured; the locked migration-009 RPC
  // then applies the requested publication state and records each transition.
  // If that RPC fails, retain the non-commerce draft instead of hard-deleting
  // a row whose relationships may already have changed.
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...row,
      category_id: category.id,
      active: false,
    })
    .select("id")
    .single();
  if (error || !data)
    return {
      error:
        error?.code === "23505"
          ? "That slug is already in use."
          : "Could not create the product.",
    };

  const { data: stateRows, error: stateError } = await supabase.rpc(
    "admin_set_product_editor_state",
    {
      p_product_id: data.id,
      p_category_id: category.id,
      p_active: input.active,
      p_featured: input.featured,
    },
  );
  if (stateError || !((stateRows ?? []) as unknown[]).length) {
    console.error(
      "product action: created draft state update failed —",
      stateError?.message ?? "No product returned",
    );
    revalidateProductCatalog(data.id, input.slug.trim());
    return {
      error:
        "Product was retained as an inactive draft because its publication state could not be applied.",
      id: data.id,
    };
  }

  revalidateProductCatalog(data.id, input.slug.trim());
  return { ok: true, id: data.id };
}

/** Duplicates a product through the locked database operation. The new row
 *  receives a collision-safe "-copy" suffix and starts as an archived,
 *  unfeatured, zero-stock draft with media and SEO fields reset. */
export async function duplicateProduct(id: string): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: "Product not found." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_duplicate_product", {
    p_product_id: id,
  });
  const duplicated = (
    (data ?? []) as Array<{ product_id: string; product_slug: string }>
  )[0];

  if (error || !duplicated) {
    return {
      error:
        error?.code === "P0002"
          ? "Product not found."
          : "Could not duplicate the product.",
    };
  }

  revalidateProductCatalog(duplicated.product_id, duplicated.product_slug);
  return { ok: true, id: duplicated.product_id };
}

export async function deleteProduct(id: string): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: "Product not found." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_manage_products", {
    p_product_ids: [id],
    p_operation: "archive",
    p_category_id: null,
  });
  const archived = (
    (data ?? []) as Array<{ product_id: string; product_slug: string }>
  )[0];

  if (error || !archived) {
    return {
      error: error?.code === "P0002" ? "Product not found." : "Could not archive the product.",
    };
  }

  revalidateProductCatalog(archived.product_id, archived.product_slug);
  return { ok: true };
}

// ── Orders ────────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "refunded",
];

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  if (!ORDER_STATUSES.includes(status)) return { error: "Unknown status." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Current state first: gates the one-time stock restore on cancel AND the
  // one-time shipped email on the shipped transition.
  const { data: current } = await supabase
    .from("orders")
    .select("status, payment_status, order_items(product_id, quantity)")
    .eq("id", orderId)
    .single();
  const previousStatus = current?.status as OrderStatus | undefined;

  // Cancelling must RETURN the stock reserved at checkout — but exactly once.
  // Skip the restore when the stock was already given back (a failed online
  // payment or a prior refund), so we never inflate inventory.
  let restoreItems: { product_id: string; quantity: number }[] = [];
  if (status === "cancelled") {
    const alreadyReleased =
      current?.payment_status === "failed" ||
      current?.payment_status === "refunded";
    if (current && !alreadyReleased) {
      restoreItems = (
        (current.order_items ?? []) as {
          product_id: string | null;
          quantity: number;
        }[]
      )
        .filter((i) => i.product_id)
        .map((i) => ({ product_id: i.product_id as string, quantity: i.quantity }));
    }
  }

  // Conditional flip: when cancelling, only transition orders that are not
  // already cancelled. The returned row count tells us whether THIS call did
  // the transition, which gates the one-time stock restore below.
  const query = supabase.from("orders").update({ status }).eq("id", orderId);
  const { data: updated, error } =
    status === "cancelled"
      ? await query.neq("status", "cancelled").select("id")
      : await query.select("id");
  if (error) return { error: "Could not update the order status." };
  const didTransition = (updated ?? []).length > 0;

  // Restore stock via the service role — restore_stock EXECUTE is service-only
  // after the 004 hardening. Best-effort: never fails the status change.
  if (status === "cancelled" && didTransition && restoreItems.length > 0) {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (service) {
      const { error: rpcError } = await service.rpc("restore_stock", {
        items: restoreItems,
      });
      if (rpcError)
        console.error("admin: restore_stock on cancel failed —", rpcError.message);
    } else {
      console.error(
        "admin: cannot restore stock on cancel — SUPABASE_SERVICE_ROLE_KEY not set.",
      );
    }
  }

  // Shipped via the dropdown → the customer gets the same "on its way" email
  // as the tracking-card path, exactly once (only on the actual transition).
  // Awaited: un-awaited promises die when the serverless function freezes.
  if (
    status === "shipped" &&
    didTransition &&
    previousStatus !== "shipped"
  ) {
    await sendShippedEmailForOrder(orderId);
  }

  // Cancelling an order that already has a courier booking must release it,
  // otherwise the parcel still ships and we pay for it. Best-effort and
  // awaited — a Shiprocket outage must not fail the cancellation itself.
  if (status === "cancelled" && didTransition) {
    await cancelShiprocketForOrder(orderId);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/** Release a Shiprocket booking when an order is cancelled/refunded.
 *  No-op when Shiprocket is unconfigured or the order was never booked. */
export async function cancelShiprocketForOrder(orderId: string): Promise<void> {
  try {
    const { isShiprocketConfigured } = await import("@/lib/config");
    if (!isShiprocketConfigured) return;

    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (!service) return;

    const { data: row } = await service
      .from("orders")
      .select("awb_number, shiprocket_order_id")
      .eq("id", orderId)
      .single();
    const awb = (row as { awb_number?: string | null } | null)?.awb_number;
    const srId = (row as { shiprocket_order_id?: string | null } | null)
      ?.shiprocket_order_id;
    if (!awb && !srId) return; // never booked — nothing to release

    const { cancelShipment } = await import("@/lib/shiprocket");
    const res = await cancelShipment({ awb, shiprocketOrderId: srId });
    if (!res.ok) {
      console.error(
        `shiprocket: could not cancel booking for order ${orderId} —`,
        res.error,
      );
      return;
    }
    await service
      .from("orders")
      .update({
        shiprocket_status: "CANCELED",
        shiprocket_synced_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  } catch (err) {
    console.error("shiprocket: cancel threw —", (err as Error).message);
  }
}

/** Load an order fresh and send the "shipped" email. Never throws. */
async function sendShippedEmailForOrder(orderId: string): Promise<void> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("orders")
      .select(
        "id, order_number, user_id, email, phone, shipping_address, subtotal, shipping_fee, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, created_at, courier, awb_number, tracking_url, discount, order_items(id, product_id, name, price, quantity, image)",
      )
      .eq("id", orderId)
      .single();
    if (!row) return;
    const extras = row as {
      courier: string | null;
      awb_number: string | null;
      tracking_url: string | null;
      discount: number | null;
    };
    const order = {
      ...mapOrderRow(row as OrderRow),
      courier: extras.courier,
      awbNumber: extras.awb_number,
      trackingUrl: extras.tracking_url,
      discount: extras.discount ?? 0,
    };
    const { sendOrderEmail } = await import("@/lib/email");
    await sendOrderEmail(order, "shipped");
  } catch (err) {
    console.error("shipped email failed:", err);
  }
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  if (!PAYMENT_STATUSES.includes(paymentStatus))
    return { error: "Unknown payment status." };

  // Refunds must go through the Refund button — it performs the actual
  // Razorpay gateway refund plus consistent bookkeeping (cancel + stock).
  // A bare flip to "refunded" here would record a refund that never happened.
  if (paymentStatus === "refunded")
    return {
      error:
        "Use the Refund button to refund — it processes the gateway refund and restores stock.",
    };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Manually marking a payment "failed" mirrors the payment.failed webhook:
  // the reserved stock must come back — exactly once. Guarded flip (only
  // pending→failed, never on cancelled orders whose stock is already back).
  if (paymentStatus === "failed") {
    const { data: flipped, error } = await supabase
      .from("orders")
      .update({ payment_status: "failed" })
      .eq("id", orderId)
      .eq("payment_status", "pending")
      .neq("status", "cancelled")
      .select("id, order_items:order_items(product_id, quantity)");
    if (error) return { error: "Could not update the payment status." };
    if ((flipped ?? []).length === 0)
      return {
        error:
          "Only a pending payment on a non-cancelled order can be marked failed.",
      };
    const items = (
      ((flipped![0] as { order_items?: { product_id: string | null; quantity: number }[] })
        .order_items ?? [])
    )
      .filter((i) => i.product_id)
      .map((i) => ({ product_id: i.product_id as string, quantity: i.quantity }));
    if (items.length > 0) {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const service = createServiceClient();
      if (service) {
        const { error: rpcError } = await service.rpc("restore_stock", { items });
        if (rpcError)
          console.error("admin: restore_stock on failed failed —", rpcError.message);
      }
    }
  } else {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus })
      .eq("id", orderId);
    if (error) return { error: "Could not update the payment status." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

// ── Shipment tracking ─────────────────────────────────────────────────

export interface TrackingInput {
  courier: string;
  awbNumber: string;
  trackingUrl: string;
  /** Also move the order to "shipped" when saving tracking. */
  markShipped: boolean;
}

/** Saves courier/AWB/tracking URL on the order. When the order is (or is
 *  being marked) shipped, fires the "shipped" email — fire-and-forget. */
export async function updateOrderTracking(
  orderId: string,
  input: TrackingInput,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const courier = input.courier.trim();
  const awbNumber = input.awbNumber.trim();
  const { normalizeOutboundUrl } = await import("@/lib/image-security");
  const trackingUrl = normalizeOutboundUrl(input.trackingUrl, {
    allowExternal: true,
    optional: true,
  });
  if (!courier) return { error: "Please choose or enter a courier." };
  if (!awbNumber) return { error: "Please enter the AWB number." };
  if (trackingUrl === null) {
    return { error: "Tracking URL must be a safe local path or HTTPS URL." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Prior status — the shipped email goes out ONLY on the transition into
  // "shipped", never again on later tracking edits (no duplicate emails).
  const { data: before } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  const wasShipped = before?.status === "shipped";

  const update: Record<string, unknown> = {
    courier,
    awb_number: awbNumber,
    tracking_url: trackingUrl || null,
  };
  if (input.markShipped) update.status = "shipped";

  const { error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", orderId);
  if (error) return { error: "Could not save the tracking details." };

  // Newly shipped this call → email once. Awaited (fire-and-forget promises
  // are dropped when the serverless function freezes after the response).
  if (input.markShipped && !wasShipped) {
    await sendShippedEmailForOrder(orderId);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

// ── Shiprocket ────────────────────────────────────────────────────────

export interface ShipOrderResult extends AdminActionResult {
  awbNumber?: string;
  courier?: string;
  /** True when the shipment exists at Shiprocket but no courier was booked
   *  yet — the admin can retry AWB assignment without duplicating the order. */
  needsAwb?: boolean;
}

/** One-click "ship with Shiprocket": creates the shipment (if not already
 *  created), books a courier, saves courier/AWB/tracking URL onto the order,
 *  marks it shipped and sends the existing "on its way" email.
 *
 *  Idempotent by design:
 *  - An order that already has a shiprocket_order_id is never re-created.
 *  - An order that already has an AWB is never re-booked.
 *  Both would otherwise cost real money and produce duplicate parcels. */
export async function shipOrderWithShiprocket(
  orderId: string,
): Promise<ShipOrderResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const { isShiprocketConfigured } = await import("@/lib/config");
  if (!isShiprocketConfigured)
    return {
      error:
        "Shiprocket is not configured. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD, then redeploy.",
    };

  // The booking engine (create → assign AWB → persist → email) lives in
  // lib/shipping-sync so the auto-ship path shares exactly this logic.
  const { bookShipmentForOrder } = await import("@/lib/shipping-sync");
  const res = await bookShipmentForOrder(orderId);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  if (res.alreadyBooked)
    return {
      error: `This order already has AWB ${res.awbNumber}. Cancel the existing shipment before re-booking.`,
    };
  if (!res.ok)
    return { error: res.error ?? "Could not book the shipment.", needsAwb: res.needsAwb };

  return { ok: true, awbNumber: res.awbNumber, courier: res.courier };
}

/** Pull the latest courier status for one order and persist it. Returns the
 *  raw Shiprocket status for display. */
export async function syncShiprocketStatus(
  orderId: string,
): Promise<AdminActionResult & { rawStatus?: string }> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const { isShiprocketConfigured } = await import("@/lib/config");
  if (!isShiprocketConfigured)
    return { error: "Shiprocket is not configured." };

  const { createServiceClient } = await import("@/lib/supabase/service");
  const service = createServiceClient();
  if (!service) return { error: "Service role key not set." };

  const { data: row } = await service
    .from("orders")
    .select("awb_number, status")
    .eq("id", orderId)
    .single();
  const awb = (row as { awb_number?: string | null } | null)?.awb_number;
  if (!awb) return { error: "This order has no AWB to track yet." };

  const { applyTrackingToOrder } = await import("@/lib/shipping-sync");
  const result = await applyTrackingToOrder(orderId, awb);
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, rawStatus: result.rawStatus };
}

/** Admin "test connection" — proves the Shiprocket credentials work. */
export async function testShiprocketConnection(): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  const { isShiprocketConfigured } = await import("@/lib/config");
  if (!isShiprocketConfigured)
    return {
      error:
        "Shiprocket is not configured. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.",
    };
  const { pingShiprocket } = await import("@/lib/shiprocket");
  const res = await pingShiprocket();
  return res.ok ? { ok: true } : { error: res.error };
}

// ── Refunds ───────────────────────────────────────────────────────────

/** Refund a paid order via lib/razorpay refundOrder() — handles the
 *  Razorpay API refund or COD bookkeeping, restores stock and flips
 *  payment_status to refunded. */
export async function refundOrderPayment(
  orderId: string,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  try {
    // Agent E provides refundOrder(orderId) in lib/razorpay — resolved at
    // runtime via dynamic import (loose-typed so builds stay green while
    // that module lands; the call signature is the agreed contract).
    const razorpay = (await import("@/lib/razorpay")) as unknown as {
      refundOrder?: (orderId: string) => Promise<unknown>;
    };
    if (typeof razorpay.refundOrder !== "function") {
      return { error: "Refunds are not available yet." };
    }
    await razorpay.refundOrder(orderId);
  } catch (err) {
    console.error("refund failed:", err);
    return {
      error:
        err instanceof Error && err.message
          ? err.message
          : "The refund could not be processed.",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

// ── Coupons ───────────────────────────────────────────────────────────

export interface CouponFormInput {
  /** Stored uppercase. */
  code: string;
  type: "percent" | "flat";
  /** percent (1-90) for percent type; PAISE for flat type. */
  value: number;
  /** paise */
  minSubtotal: number;
  /** paise cap for percent type, null = no cap */
  maxDiscount: number | null;
  /** ISO date (yyyy-mm-dd) or null = never expires */
  expiresAt: string | null;
  /** null = unlimited */
  usageLimit: number | null;
}

function validateCoupon(c: CouponFormInput): string | null {
  if (!/^[A-Z0-9]{3,24}$/.test(c.code))
    return "Code must be 3-24 letters/numbers (no spaces).";
  if (c.type !== "percent" && c.type !== "flat")
    return "Unknown coupon type.";
  if (c.type === "percent" && (!Number.isInteger(c.value) || c.value < 1 || c.value > 90))
    return "Percent discount must be between 1 and 90.";
  if (c.type === "flat" && (!Number.isInteger(c.value) || c.value <= 0))
    return "Please enter a valid flat discount amount.";
  if (!Number.isInteger(c.minSubtotal) || c.minSubtotal < 0)
    return "Minimum subtotal must be zero or more.";
  if (
    c.maxDiscount !== null &&
    (!Number.isInteger(c.maxDiscount) || c.maxDiscount <= 0)
  )
    return "Maximum discount must be a positive amount.";
  if (c.usageLimit !== null && (!Number.isInteger(c.usageLimit) || c.usageLimit < 1))
    return "Usage limit must be at least 1.";
  if (c.expiresAt !== null && Number.isNaN(Date.parse(c.expiresAt)))
    return "Please enter a valid expiry date.";
  return null;
}

export async function createCoupon(
  input: CouponFormInput,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const coupon = { ...input, code: input.code.trim().toUpperCase() };
  const invalid = validateCoupon(coupon);
  if (invalid) return { error: invalid };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    min_subtotal: coupon.minSubtotal,
    max_discount: coupon.type === "percent" ? coupon.maxDiscount : null,
    expires_at: coupon.expiresAt
      ? new Date(`${coupon.expiresAt}T23:59:59+05:30`).toISOString()
      : null,
    usage_limit: coupon.usageLimit,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That coupon code already exists."
          : "Could not create the coupon.",
    };

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCouponActive(
  couponId: string,
  active: boolean,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({ active })
    .eq("id", couponId);
  if (error) return { error: "Could not update the coupon." };

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCoupon(
  couponId: string,
): Promise<AdminActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) return { error: "Could not delete the coupon." };

  revalidatePath("/admin/coupons");
  return { ok: true };
}
