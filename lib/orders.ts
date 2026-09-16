import { randomUUID } from "node:crypto";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  isDemoMode,
} from "@/lib/config";
import { getProductsByIds } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import {
  issueGuestOrderCredential,
  validateGuestOrderCredential,
  type GuestOrderCredential,
} from "@/lib/guest-order-access";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  Address,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
} from "@/lib/types";

/** Server-side order helpers: checkout payload validation, catalog-priced
 *  cart totals, coupon validation, atomic stock reservation, demo-order
 *  construction and Supabase persistence.
 *  Imports node:crypto — server code only (API routes / server components).
 *  Client components may `import type` from here, nothing else. */

// ── Order extras (columns added by migration 002) ─────────────────────
// lib/types.ts is frozen, so the growth columns are typed here and
// intersected onto Order. All server order reads/writes go through this
// module, so every order object it returns carries these fields.

export interface OrderExtras {
  couponCode: string | null;
  discount: number; // paise
  courier: string | null;
  awbNumber: string | null;
  trackingUrl: string | null;
}

export type OrderWithExtras = Order & OrderExtras;

// ── Shipping / totals (all paise) ─────────────────────────────────────

export interface OrderTotals {
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
}

export function calcShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/** Totals for a priced cart. Shipping is computed on the PRE-discount
 *  subtotal (a money coupon can't unlock free shipping); the discount then
 *  comes off the grand total. A `free_shipping` coupon instead waives the
 *  shipping fee entirely (`freeShipping: true`) with discount 0. */
export function calcTotals(
  items: OrderItem[],
  discount = 0,
  freeShipping = false,
): OrderTotals {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = freeShipping ? 0 : calcShippingFee(subtotal);
  const applied = Math.max(0, Math.min(discount, subtotal));
  return {
    subtotal,
    shippingFee,
    discount: applied,
    total: subtotal + shippingFee - applied,
  };
}

// ── Checkout payload validation ───────────────────────────────────────

export interface CheckoutLine {
  productId: string;
  quantity: number;
}

export interface CheckoutContact {
  email: string;
  phone: string;
}

export interface CheckoutPayload {
  items: CheckoutLine[];
  contact: CheckoutContact;
  address: Address;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian 10-digit mobile
const PINCODE_RE = /^[1-9]\d{5}$/; // 6-digit PIN, no leading zero

const str = (value: unknown): string =>
  typeof value === "string" ? value.normalize("NFKC").trim() : "";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type ParseResult =
  | { ok: true; payload: CheckoutPayload }
  | { ok: false; error: string };

/** Validate + normalise an untrusted checkout request body. Never trusts
 *  client prices — only bounded productId/quantity pairs are accepted. */
export function parseCheckoutPayload(body: unknown): ParseResult {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid request body." };
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (body.items.length > 50) {
    return { ok: false, error: "Too many items in the cart." };
  }

  const merged = new Map<string, number>();
  for (const raw of body.items) {
    if (!isRecord(raw)) {
      return { ok: false, error: "Invalid cart item." };
    }
    const productId = str(raw.productId);
    const quantity = Number(raw.quantity);
    if (
      !productId ||
      productId.length > 128 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return { ok: false, error: "Invalid cart item." };
    }
    const mergedQuantity = (merged.get(productId) ?? 0) + quantity;
    if (mergedQuantity > 10) {
      return { ok: false, error: "A product quantity cannot exceed 10." };
    }
    merged.set(productId, mergedQuantity);
  }
  const items: CheckoutLine[] = Array.from(merged, ([productId, quantity]) => ({
    productId,
    quantity,
  }));

  if (!isRecord(body.contact)) {
    return { ok: false, error: "Invalid contact details." };
  }
  const email = str(body.contact.email).toLowerCase();
  const rawContactPhone = str(body.contact.phone);
  const contactPhone = rawContactPhone.replace(/\D/g, "");
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (rawContactPhone.length > 32 || !PHONE_RE.test(contactPhone)) {
    return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  }

  if (!isRecord(body.address)) {
    return { ok: false, error: "Invalid shipping address." };
  }
  const rawAddressPhone = str(body.address.phone);
  const address: Address = {
    name: str(body.address.name),
    phone: rawAddressPhone.replace(/\D/g, "") || contactPhone,
    line1: str(body.address.line1),
    line2: str(body.address.line2) || undefined,
    city: str(body.address.city),
    state: str(body.address.state),
    pincode: str(body.address.pincode),
  };
  if (!address.name || address.name.length > 100) {
    return { ok: false, error: "Please enter a valid recipient name." };
  }
  if (!address.line1 || address.line1.length > 200) {
    return { ok: false, error: "Please enter a valid address line 1." };
  }
  if (address.line2 && address.line2.length > 200) {
    return { ok: false, error: "Address line 2 is too long." };
  }
  if (!address.city || address.city.length > 100) {
    return { ok: false, error: "Please enter a valid city." };
  }
  if (!address.state || address.state.length > 100) {
    return { ok: false, error: "Please enter a valid state." };
  }
  if (!PINCODE_RE.test(address.pincode)) {
    return { ok: false, error: "Please enter a valid 6-digit PIN code." };
  }
  if (rawAddressPhone.length > 32 || !PHONE_RE.test(address.phone)) {
    return { ok: false, error: "Please enter a valid delivery phone number." };
  }

  const paymentMethod = str(body.paymentMethod) as PaymentMethod;
  if (!["razorpay", "cod", "demo"].includes(paymentMethod)) {
    return { ok: false, error: "Invalid payment method." };
  }

  const couponCode = str(body.couponCode).toUpperCase();
  if (couponCode.length > 40) {
    return { ok: false, error: "Invalid coupon code." };
  }

  return {
    ok: true,
    payload: {
      items,
      contact: { email, phone: contactPhone },
      address,
      paymentMethod,
      couponCode: couponCode || undefined,
    },
  };
}

// ── Server-side cart pricing (catalog is the only price source) ───────

type PriceResult =
  | { ok: true; items: OrderItem[]; totals: OrderTotals }
  | { ok: false; error: string };

export async function priceCartLines(lines: CheckoutLine[]): Promise<PriceResult> {
  const products = await getProductsByIds(lines.map((l) => l.productId));
  const items: OrderItem[] = [];
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product || !product.active) {
      return {
        ok: false,
        error: "Some items in your cart are no longer available. Please review your cart.",
      };
    }
    if (product.stock < line.quantity) {
      return {
        ok: false,
        error: `Only ${product.stock} left in stock for "${product.name}". Please adjust the quantity.`,
      };
    }
    items.push({
      productId: product.id,
      name: product.name,
      price: product.price, // catalog price — never the client's
      quantity: line.quantity,
      image: product.images[0] ?? "",
    });
  }
  return { ok: true, items, totals: calcTotals(items) };
}

// ── Coupons ───────────────────────────────────────────────────────────

export type CouponType = "percent" | "flat" | "free_shipping";

export interface CouponCheck {
  valid: boolean;
  /** Canonical code (as stored) when valid. */
  code?: string;
  /** Discount in paise when valid — always 0 for `free_shipping`. */
  discount?: number;
  /** Coupon kind when valid; `free_shipping` waives the shipping fee. */
  type?: CouponType;
  /** Human-readable rejection reason when invalid. */
  reason?: string;
}

function parseCouponType(value: unknown): CouponType | undefined {
  return value === "percent" || value === "flat" || value === "free_shipping"
    ? value
    : undefined;
}

/** Demo-mode stand-in for the coupons table: WELCOME10 — 10% off, capped
 *  ₹500, minimum order ₹999. Mirrors the seed row in migration 002. */
const DEMO_COUPON = {
  code: "WELCOME10",
  percent: 10,
  maxDiscount: 50000, // paise
  minSubtotal: 99900, // paise
};

/** Demo-mode free-shipping code (discount 0 — checkout waives the fee). */
const DEMO_FREE_SHIPPING_CODE = "SHIPFREE";

/** Validate a coupon against the current subtotal (paise). Demo mode uses
 *  the hardcoded WELCOME10; live mode calls the security-definer
 *  validate_coupon RPC — safe on the server anon client (the coupons table
 *  itself stays admin-only). Never throws. */
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<CouponCheck> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { valid: false, reason: "Enter a coupon code." };

  if (isDemoMode) {
    if (normalized === DEMO_FREE_SHIPPING_CODE) {
      return {
        valid: true,
        code: DEMO_FREE_SHIPPING_CODE,
        discount: 0,
        type: "free_shipping",
      };
    }
    if (normalized !== DEMO_COUPON.code) {
      return { valid: false, reason: "Invalid code" };
    }
    if (subtotal < DEMO_COUPON.minSubtotal) {
      return {
        valid: false,
        reason: `This code needs a minimum order of ${formatINR(DEMO_COUPON.minSubtotal)}.`,
      };
    }
    const discount = Math.min(
      Math.floor((subtotal * DEMO_COUPON.percent) / 100),
      DEMO_COUPON.maxDiscount,
    );
    return { valid: true, code: DEMO_COUPON.code, discount, type: "percent" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: normalized,
      p_subtotal: subtotal,
    });
    if (error) {
      console.error("coupons: validate_coupon failed —", error.message);
      return { valid: false, reason: "Could not check the code. Please try again." };
    }
    const result = (data ?? {}) as {
      valid?: boolean;
      code?: string;
      type?: string;
      discount?: number;
      reason?: string;
      minSubtotal?: number;
    };
    if (!result.valid) {
      const reason =
        typeof result.minSubtotal === "number"
          ? `This code needs a minimum order of ${formatINR(result.minSubtotal)}.`
          : (result.reason ?? "Invalid code");
      return { valid: false, reason };
    }
    const discount = Math.max(
      0,
      Math.min(Math.floor(Number(result.discount ?? 0)), subtotal),
    );
    return {
      valid: true,
      code: result.code ?? normalized,
      discount,
      type: parseCouponType(result.type),
    };
  } catch (err) {
    console.error("coupons: validate_coupon failed —", err);
    return { valid: false, reason: "Could not check the code. Please try again." };
  }
}

/** Bump used_count after a successful order. Fire-and-forget semantics —
 *  logs and swallows failures (an uncounted redemption must never block
 *  or unwind a placed order). */
export async function incrementCouponUsage(code: string): Promise<void> {
  if (isDemoMode || !code) return;
  try {
    const service = createServiceClient();
    if (!service) {
      console.error("coupons: usage update unavailable — service role missing.");
      return;
    }
    const { error } = await service.rpc("increment_coupon_usage", {
      p_code: code,
    });
    if (error) {
      console.error("coupons: increment_coupon_usage failed —", error.message);
    }
  } catch (err) {
    console.error("coupons: increment_coupon_usage failed —", err);
  }
}

// ── Atomic stock reservation (decrement_stock / restore_stock RPCs) ───

const stockPayload = (items: OrderItem[]) =>
  items.map((i) => ({ product_id: i.productId, quantity: i.quantity }));

export type StockResult =
  | { ok: true; reserved: boolean }
  | { ok: false; reason: "out_of_stock"; outOfStockName: string }
  | { ok: false; reason: "unavailable" };

/** Atomically decrement every line. Live checkout fails closed if the
 * service role or RPC is unavailable; only demo mode may skip reservation. */
export async function decrementStock(items: OrderItem[]): Promise<StockResult> {
  if (isDemoMode) return { ok: true, reserved: false };

  const service = createServiceClient();
  if (!service) {
    console.error("orders: stock reservation unavailable — service role missing.");
    return { ok: false, reason: "unavailable" };
  }

  const { error } = await service.rpc("decrement_stock", {
    items: stockPayload(items),
  });
  if (!error) return { ok: true, reserved: true };

  const match = /INSUFFICIENT_STOCK:([0-9a-fA-F-]+)/.exec(error.message ?? "");
  if (match) {
    const name =
      items.find((item) => item.productId === match[1])?.name ??
      "One of the items in your cart";
    return { ok: false, reason: "out_of_stock", outOfStockName: name };
  }

  console.error("orders: decrement_stock unavailable —", error.message);
  return { ok: false, reason: "unavailable" };
}

/** Return a reservation and report whether the rollback reached the DB. */
export async function restoreStock(items: OrderItem[]): Promise<boolean> {
  if (isDemoMode || items.length === 0) return true;
  const service = createServiceClient();
  if (!service) {
    console.error("orders: stock rollback unavailable — service role missing.");
    return false;
  }
  const { error } = await service.rpc("restore_stock", {
    items: stockPayload(items),
  });
  if (error) {
    console.error("orders: restore_stock failed —", error.message);
    return false;
  }
  return true;
}

// ── Demo-mode order (client persists it to localStorage `fs-orders`) ──

export function buildDemoOrder(
  payload: CheckoutPayload,
  items: OrderItem[],
  totals: OrderTotals,
  couponCode?: string | null,
): OrderWithExtras {
  return {
    id: randomUUID(),
    // Mirrors the live FS-10001+ sequence; random within the demo session.
    orderNumber: `FS-${10001 + Math.floor(Math.random() * 89999)}`,
    userId: null,
    email: payload.contact.email,
    phone: payload.contact.phone,
    shippingAddress: payload.address,
    items,
    subtotal: totals.subtotal,
    shippingFee: totals.shippingFee,
    total: totals.total,
    paymentMethod: "demo",
    paymentStatus: "paid", // simulated
    razorpayOrderId: null,
    razorpayPaymentId: null,
    status: "confirmed",
    createdAt: new Date().toISOString(),
    // Callers only pass a code that passed validation — record it even when
    // the money discount is 0 (free_shipping waives the fee instead).
    couponCode: couponCode ?? null,
    discount: totals.discount,
    courier: null,
    awbNumber: null,
    trackingUrl: null,
  };
}

// ── Supabase persistence (live mode) ──────────────────────────────────

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string;
  shipping_address: Address;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: OrderStatus;
  created_at: string;
  // migration 002 columns (optional so pre-migration rows still map)
  coupon_code?: string | null;
  discount?: number | null;
  courier?: string | null;
  awb_number?: string | null;
  tracking_url?: string | null;
}

export function mapOrderRow(row: OrderRow, items: OrderItem[]): OrderWithExtras {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    email: row.email,
    phone: row.phone,
    shippingAddress: row.shipping_address,
    items,
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    status: row.status,
    createdAt: row.created_at,
    couponCode: row.coupon_code ?? null,
    discount: row.discount ?? 0,
    courier: row.courier ?? null,
    awbNumber: row.awb_number ?? null,
    trackingUrl: row.tracking_url ?? null,
  };
}

interface CreateOrderInput {
  payload: CheckoutPayload;
  items: OrderItem[];
  totals: OrderTotals;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  couponCode?: string | null;
}

type CreateOrderResult =
  | {
      ok: true;
      order: OrderWithExtras;
      /** Returned separately so bearer material never enters an Order object. */
      guestCredential: GuestOrderCredential | null;
    }
  | {
      ok: false;
      error: string;
      reason: "service_unavailable" | "persistence_failed";
    };

/**
 * Insert a live order and all item snapshots through one required service
 * client. The session client is used only to authenticate ownership; it never
 * writes orders. Any item/credential failure removes the parent row (items
 * cascade) so checkout can safely roll back its stock reservation.
 */
export async function createSupabaseOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const service = createServiceClient();
  if (!service) {
    console.error("orders: creation unavailable — service role missing.");
    return {
      ok: false,
      error: "Ordering is temporarily unavailable. Please try again shortly.",
      reason: "service_unavailable",
    };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const couponCode = input.couponCode ?? null;
  const { data: row, error: orderError } = await service
    .from("orders")
    .insert({
      email: input.payload.contact.email,
      phone: input.payload.contact.phone,
      shipping_address: input.payload.address,
      subtotal: input.totals.subtotal,
      shipping_fee: input.totals.shippingFee,
      total: input.totals.total,
      payment_method: input.paymentMethod,
      payment_status: input.paymentStatus,
      status: input.status,
      razorpay_order_id: input.razorpayOrderId ?? null,
      razorpay_payment_id: input.razorpayPaymentId ?? null,
      coupon_code: couponCode,
      discount: input.totals.discount,
      user_id: user?.id ?? null,
    })
    .select("*")
    .single();

  if (orderError || !row) {
    console.error("orders: insert failed —", orderError?.message);
    return {
      ok: false,
      error: "Could not save your order. Please try again.",
      reason: "persistence_failed",
    };
  }

  const order = mapOrderRow(row as OrderRow, input.items);
  const removePartialOrder = async (failure: string) => {
    const { error } = await service.from("orders").delete().eq("id", order.id);
    if (error) {
      console.error(
        `orders: CRITICAL partial-order cleanup failed after ${failure} —`,
        error.message,
      );
    }
  };

  const { error: itemsError } = await service.from("order_items").insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    })),
  );
  if (itemsError) {
    console.error("orders: order_items insert failed —", itemsError.message);
    await removePartialOrder("item insert failure");
    return {
      ok: false,
      error: "Could not save your order. Please try again.",
      reason: "persistence_failed",
    };
  }

  let guestCredential: GuestOrderCredential | null = null;
  if (!user) {
    guestCredential = await issueGuestOrderCredential(
      order.id,
      undefined,
      service,
    );
    if (!guestCredential) {
      await removePartialOrder("guest credential failure");
      return {
        ok: false,
        error: "Could not securely save your order. Please try again.",
        reason: "persistence_failed",
      };
    }
  }

  return { ok: true, order, guestCredential };
}

/**
 * Fetch an order for an owner/admin session or for a guest presenting the
 * separately issued scoped credential. UUID-only access is limited to the
 * one migration-stamped grace deadline on pre-006 guest rows.
 */
export async function getSupabaseOrder(
  id: string,
  options: { guestToken?: string | null } = {},
): Promise<OrderWithExtras | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const sessionClient = await createClient();
  const ownerRead = await sessionClient
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  let row: OrderRow | null = (ownerRead.data as OrderRow | null) ?? null;
  let itemsClient = sessionClient;

  if (!row) {
    const service = createServiceClient();
    if (!service) return null;
    const guestRead = await service
      .from("orders")
      .select("*")
      .eq("id", id)
      .is("user_id", null)
      .maybeSingle();
    if (guestRead.error || !guestRead.data) return null;

    const guestRow = guestRead.data as OrderRow & {
      guest_legacy_access_until?: string | null;
    };
    const credential = options.guestToken
      ? await validateGuestOrderCredential(id, options.guestToken)
      : { valid: false };
    const legacyDeadline = guestRow.guest_legacy_access_until
      ? Date.parse(guestRow.guest_legacy_access_until)
      : Number.NaN;
    const legacyAllowed =
      Number.isFinite(legacyDeadline) && legacyDeadline > Date.now();
    if (!credential.valid && !legacyAllowed) return null;

    row = guestRow;
    itemsClient = service;
  }

  const { data: itemRows, error: itemsError } = await itemsClient
    .from("order_items")
    .select("product_id, name, price, quantity, image")
    .eq("order_id", id);
  if (itemsError) {
    console.error("orders: order item read failed —", itemsError.message);
    return null;
  }

  const items: OrderItem[] = (itemRows ?? []).map((item) => ({
    productId: item.product_id ?? "",
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: item.image ?? "",
  }));
  return mapOrderRow(row, items);
}

export type PaymentPersistenceReason =
  | "service_unavailable"
  | "not_found"
  | "read_error"
  | "amount_mismatch"
  | "payment_id_mismatch"
  | "payment_id_conflict"
  | "order_cancelled"
  | "invalid_state"
  | "items_missing"
  | "out_of_stock"
  | "update_error";

/**
 * Atomically confirms a Razorpay capture. Migration 006 locks the order and,
 * for a previously failed payment, re-reserves every item before changing the
 * order to paid. A failed reservation leaves both stock and order unchanged.
 */
export async function markOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  opts: { capturedAmount?: number } = {},
): Promise<{
  persisted: boolean;
  alreadyPaid: boolean;
  order: OrderWithExtras | null;
  reason?: PaymentPersistenceReason;
}> {
  const service = createServiceClient();
  if (!service) {
    console.error("orders: payment confirmation unavailable — service role missing.");
    return {
      persisted: false,
      alreadyPaid: false,
      order: null,
      reason: "service_unavailable",
    };
  }

  const { data, error } = await service.rpc("confirm_razorpay_order_payment", {
    p_razorpay_order_id: razorpayOrderId,
    p_razorpay_payment_id: razorpayPaymentId,
    p_captured_amount: opts.capturedAmount ?? null,
  });
  if (error) {
    console.error("orders: payment confirmation RPC failed —", error.message);
    return {
      persisted: false,
      alreadyPaid: false,
      order: null,
      reason: "update_error",
    };
  }

  const outcome = (data ?? {}) as {
    ok?: boolean;
    already_paid?: boolean;
    order_id?: string;
    reason?: string;
    item_name?: string;
  };
  if (outcome.ok !== true || !outcome.order_id) {
    const allowedReasons: PaymentPersistenceReason[] = [
      "not_found",
      "amount_mismatch",
      "payment_id_mismatch",
      "payment_id_conflict",
      "order_cancelled",
      "invalid_state",
      "items_missing",
      "out_of_stock",
    ];
    const reason = allowedReasons.includes(outcome.reason as PaymentPersistenceReason)
      ? (outcome.reason as PaymentPersistenceReason)
      : "update_error";
    console.error(
      `orders: captured payment not confirmed (${reason})${outcome.item_name ? ` for ${outcome.item_name}` : ""}.`,
    );
    return { persisted: false, alreadyPaid: false, order: null, reason };
  }
  if (outcome.already_paid) {
    return { persisted: true, alreadyPaid: true, order: null };
  }

  const [orderRead, itemsRead] = await Promise.all([
    service.from("orders").select("*").eq("id", outcome.order_id).single(),
    service
      .from("order_items")
      .select("product_id, name, price, quantity, image")
      .eq("order_id", outcome.order_id),
  ]);
  if (orderRead.error || !orderRead.data || itemsRead.error) {
    console.error(
      "orders: confirmed payment but post-confirmation read failed —",
      orderRead.error?.message ?? itemsRead.error?.message,
    );
    return { persisted: true, alreadyPaid: false, order: null };
  }

  const items: OrderItem[] = (itemsRead.data ?? []).map((item) => ({
    productId: item.product_id ?? "",
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: item.image ?? "",
  }));
  const paidOrder = mapOrderRow(orderRead.data as OrderRow, items);

  if (paidOrder.couponCode) await incrementCouponUsage(paidOrder.couponCode);

  try {
    const { autoShipIfEnabled } = await import("@/lib/shipping-sync");
    await autoShipIfEnabled(paidOrder.id);
  } catch (err) {
    console.error("orders: auto-ship hook failed —", (err as Error).message);
  }

  return { persisted: true, alreadyPaid: false, order: paidOrder };
}

export type PaymentFailureReason =
  | "service_unavailable"
  | "not_found"
  | "update_error";

/** Atomically marks a pending payment failed and restores its reservation. */
export async function markOrderPaymentFailed(
  razorpayOrderId: string,
): Promise<{ handled: boolean; updated: boolean; reason?: PaymentFailureReason }> {
  if (isDemoMode) return { handled: true, updated: false };
  const service = createServiceClient();
  if (!service) {
    console.error("orders: cannot mark payment failed — service role missing.");
    return { handled: false, updated: false, reason: "service_unavailable" };
  }

  const { data, error } = await service.rpc("fail_razorpay_order_payment", {
    p_razorpay_order_id: razorpayOrderId,
  });
  if (error) {
    console.error("orders: mark-failed RPC failed —", error.message);
    return { handled: false, updated: false, reason: "update_error" };
  }
  const outcome = (data ?? {}) as {
    ok?: boolean;
    updated?: boolean;
    reason?: string;
  };
  if (outcome.ok !== true) {
    return {
      handled: false,
      updated: false,
      reason: outcome.reason === "not_found" ? "not_found" : "update_error",
    };
  }
  return { handled: true, updated: outcome.updated === true };
}

export type StaleOrderReapResult =
  | { ok: true; reaped: number }
  | {
      ok: false;
      reaped: number;
      reason: "service_unavailable" | "query_failed" | "transition_failed";
    };

/** Reap abandoned pending Razorpay orders through the same atomic
 * failed+restore transition used by the webhook. Infrastructure failures are
 * returned explicitly so the authenticated cron route can emit a non-2xx. */
export async function reapStalePendingRazorpayOrders(
  olderThanMinutes = 45,
): Promise<StaleOrderReapResult> {
  if (isDemoMode) return { ok: true, reaped: 0 };
  const service = createServiceClient();
  if (!service) {
    console.error("orders: cannot reap stale orders — service role missing.");
    return { ok: false, reaped: 0, reason: "service_unavailable" };
  }

  const cutoffIso = new Date(
    Date.now() - olderThanMinutes * 60_000,
  ).toISOString();
  const { data: stale, error } = await service
    .from("orders")
    .select("razorpay_order_id")
    .eq("payment_method", "razorpay")
    .eq("payment_status", "pending")
    .neq("status", "cancelled")
    .lt("created_at", cutoffIso)
    .not("razorpay_order_id", "is", null)
    .limit(100);
  if (error) {
    console.error("orders: reap query failed —", error.message);
    return { ok: false, reaped: 0, reason: "query_failed" };
  }

  let reaped = 0;
  let transitionFailed = false;
  for (const row of stale ?? []) {
    if (!row.razorpay_order_id) continue;
    const result = await service.rpc("fail_razorpay_order_payment", {
      p_razorpay_order_id: row.razorpay_order_id,
    });
    if (result.error) {
      transitionFailed = true;
      console.error("orders: atomic reap failed —", result.error.message);
      continue;
    }
    const outcome = (result.data ?? {}) as { ok?: boolean; updated?: boolean };
    if (outcome.ok !== true) {
      transitionFailed = true;
      console.error("orders: atomic reap returned an unsuccessful outcome.");
      continue;
    }
    if (outcome.updated) reaped += 1;
  }
  if (reaped > 0) console.log(`orders: reaped ${reaped} stale pending order(s).`);
  return transitionFailed
    ? { ok: false, reaped, reason: "transition_failed" }
    : { ok: true, reaped };
}
