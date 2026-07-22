import { randomUUID } from "node:crypto";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  isDemoMode,
} from "@/lib/config";
import { getProductsByIds } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
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

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

type ParseResult =
  | { ok: true; payload: CheckoutPayload }
  | { ok: false; error: string };

/** Validate + normalise an untrusted checkout request body. Never trusts
 *  client prices — only productId/quantity pairs are accepted for items. */
export function parseCheckoutPayload(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;

  // items → merged, quantity-capped lines
  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (b.items.length > 50) {
    return { ok: false, error: "Too many items in the cart." };
  }
  const merged = new Map<string, number>();
  for (const raw of b.items) {
    const line = raw as Record<string, unknown>;
    const productId = str(line.productId);
    const quantity = Number(line.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: "Invalid cart item." };
    }
    merged.set(productId, Math.min((merged.get(productId) ?? 0) + quantity, 10));
  }
  const items: CheckoutLine[] = Array.from(merged, ([productId, quantity]) => ({
    productId,
    quantity,
  }));

  // contact
  const contactRaw = (b.contact ?? {}) as Record<string, unknown>;
  const email = str(contactRaw.email).toLowerCase();
  const contactPhone = str(contactRaw.phone).replace(/\D/g, "");
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!PHONE_RE.test(contactPhone)) {
    return { ok: false, error: "Please enter a valid 10-digit mobile number." };
  }

  // shipping address
  const a = (b.address ?? {}) as Record<string, unknown>;
  const address: Address = {
    name: str(a.name),
    phone: str(a.phone).replace(/\D/g, "") || contactPhone,
    line1: str(a.line1),
    line2: str(a.line2) || undefined,
    city: str(a.city),
    state: str(a.state),
    pincode: str(a.pincode),
  };
  if (!address.name) return { ok: false, error: "Recipient name is required." };
  if (!address.line1) return { ok: false, error: "Address line 1 is required." };
  if (!address.city) return { ok: false, error: "City is required." };
  if (!address.state) return { ok: false, error: "State is required." };
  if (!PINCODE_RE.test(address.pincode)) {
    return { ok: false, error: "Please enter a valid 6-digit PIN code." };
  }
  if (!PHONE_RE.test(address.phone)) {
    return { ok: false, error: "Please enter a valid delivery phone number." };
  }

  // payment method
  const paymentMethod = str(b.paymentMethod) as PaymentMethod;
  if (!["razorpay", "cod", "demo"].includes(paymentMethod)) {
    return { ok: false, error: "Invalid payment method." };
  }

  // coupon code (optional) — re-validated against the coupons table later
  const couponCode = str(b.couponCode).toUpperCase();
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
    const client =
      service ?? (await (await import("@/lib/supabase/server")).createClient());
    const { error } = await client.rpc("increment_coupon_usage", {
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
  | { ok: false; outOfStockName: string };

/** Atomically decrement stock for every line (all-or-nothing inside the
 *  RPC). Demo mode and a missing service key both skip gracefully
 *  (`reserved:false` → callers must not restore what was never taken).
 *  Only a genuine INSUFFICIENT_STOCK raises a caller-visible failure —
 *  infra errors fail open so checkout keeps working. */
export async function decrementStock(items: OrderItem[]): Promise<StockResult> {
  if (isDemoMode) return { ok: true, reserved: false };

  const service = createServiceClient();
  if (!service) {
    console.warn(
      "orders: SUPABASE_SERVICE_ROLE_KEY not set — stock decrement skipped.",
    );
    return { ok: true, reserved: false };
  }

  const { error } = await service.rpc("decrement_stock", {
    items: stockPayload(items),
  });
  if (!error) return { ok: true, reserved: true };

  const match = /INSUFFICIENT_STOCK:([0-9a-fA-F-]+)/.exec(error.message ?? "");
  if (match) {
    const name =
      items.find((i) => i.productId === match[1])?.name ??
      "One of the items in your cart";
    return { ok: false, outOfStockName: name };
  }

  console.error("orders: decrement_stock failed —", error.message);
  return { ok: true, reserved: false };
}

/** Return previously reserved stock (order failed / payment failed /
 *  refund). Best-effort: logs, never throws. */
export async function restoreStock(items: OrderItem[]): Promise<void> {
  if (isDemoMode || items.length === 0) return;
  const service = createServiceClient();
  if (!service) return;
  const { error } = await service.rpc("restore_stock", {
    items: stockPayload(items),
  });
  if (error) console.error("orders: restore_stock failed —", error.message);
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
  | { ok: true; order: OrderWithExtras }
  | { ok: false; error: string };

/** Insert an order (+ items) into Supabase. Attaches user_id when a session
 *  exists; guest orders insert with user_id null (allowed by RLS).
 *
 *  RLS nuance: the orders SELECT policy only covers owners/admins, so a
 *  guest insert cannot use `return=representation` (PostgREST would reject
 *  the whole statement). Logged-in users insert-with-select to receive the
 *  DB-generated FS-1000x order number; guests insert with a server-generated
 *  id + order number (FS-9xxxxx range, clear of the sequence) and
 *  `return=minimal`. */
export async function createSupabaseOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Callers only pass a code that passed validation — keep it even when the
  // money discount is 0 (free_shipping coupons waive the fee instead).
  const couponCode = input.couponCode ?? null;

  const baseRow = {
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
  };

  let order: OrderWithExtras | null = null;

  if (user) {
    const { data: row, error } = await supabase
      .from("orders")
      .insert({ ...baseRow, user_id: user.id })
      .select("*")
      .single();
    if (error || !row) {
      console.error("orders: insert failed —", error?.message);
      return { ok: false, error: "Could not save your order. Please try again." };
    }
    order = mapOrderRow(row as OrderRow, input.items);
  } else {
    // Guest path — generate id + order number ourselves, no returning.
    for (let attempt = 0; attempt < 2 && !order; attempt++) {
      const id = randomUUID();
      const orderNumber = `FS-${900000 + Math.floor(Math.random() * 100000)}`;
      const { error } = await supabase
        .from("orders")
        .insert({ ...baseRow, id, order_number: orderNumber, user_id: null });
      if (!error) {
        order = mapOrderRow(
          {
            ...baseRow,
            id,
            order_number: orderNumber,
            user_id: null,
            created_at: new Date().toISOString(),
          },
          input.items,
        );
      } else if (attempt === 1) {
        console.error("orders: guest insert failed —", error.message);
        return { ok: false, error: "Could not save your order. Please try again." };
      }
    }
  }

  if (!order) {
    return { ok: false, error: "Could not save your order. Please try again." };
  }

  // Prefer the service client for order_items: the RLS insert policy checks
  // the parent order via an EXISTS subquery on orders, which the anon
  // orders-SELECT policy hides for guest rows — so guest item inserts are
  // blocked under anon even though the guest order insert itself succeeds.
  const itemsClient = createServiceClient() ?? supabase;
  const { error: itemsError } = await itemsClient.from("order_items").insert(
    input.items.map((i) => ({
      order_id: order!.id,
      product_id: i.productId,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
    })),
  );
  if (itemsError) {
    // Order row exists — return it anyway, items travel with the response.
    console.error("orders: order_items insert failed —", itemsError.message);
  }

  return { ok: true, order };
}

/** Fetch a single order (+ items) from Supabase. RLS applies: owners and
 *  admins only — guest orders are surfaced from the checkout response /
 *  local cache instead. */
export async function getSupabaseOrder(id: string): Promise<OrderWithExtras | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return null;

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("product_id, name, price, quantity, image")
    .eq("order_id", id);

  const items: OrderItem[] = (itemRows ?? []).map((i) => ({
    productId: i.product_id ?? "",
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    image: i.image ?? "",
  }));

  return mapOrderRow(row as OrderRow, items);
}

/** Mark a Razorpay order paid after signature/webhook verification.
 *  Idempotent — an already-paid order is left untouched (`alreadyPaid`).
 *  Also recovers orders in payment_status=failed: Razorpay lets customers
 *  retry inside the same widget (failed UPI → successful card on the SAME
 *  razorpay order), so a capture after a failed attempt must still land —
 *  and must re-reserve the stock that the failed handler restored.
 *
 *  RLS only grants UPDATE on orders to admins, so this prefers the
 *  service-role client. Without it the update falls back to the session
 *  client and will succeed only for admin sessions — callers report
 *  persistence honestly either way. Returns the updated order (with items)
 *  when this call did the flip, so callers can send the confirmation
 *  email exactly once. */
export async function markOrderPaid(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<{
  persisted: boolean;
  alreadyPaid: boolean;
  order: OrderWithExtras | null;
}> {
  const service = createServiceClient();
  const client =
    service ?? (await (await import("@/lib/supabase/server")).createClient());

  const { data: existing, error: readError } = await client
    .from("orders")
    .select("id, payment_status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (readError || !existing) {
    if (readError) console.error("orders: mark-paid read failed —", readError.message);
    return { persisted: false, alreadyPaid: false, order: null };
  }
  if (existing.payment_status === "paid") {
    return { persisted: true, alreadyPaid: true, order: null };
  }
  const wasFailed = existing.payment_status === "failed";

  const { data, error } = await client
    .from("orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      razorpay_payment_id: razorpayPaymentId,
    })
    .eq("id", existing.id)
    .in("payment_status", ["pending", "failed"])
    .select("*");

  if (error) {
    console.error("orders: mark-paid failed —", error.message);
    return { persisted: false, alreadyPaid: false, order: null };
  }
  const row = (data ?? [])[0] as OrderRow | undefined;
  if (!row) return { persisted: false, alreadyPaid: false, order: null };

  const { data: itemRows } = await client
    .from("order_items")
    .select("product_id, name, price, quantity, image")
    .eq("order_id", row.id);
  const items: OrderItem[] = (itemRows ?? []).map((i) => ({
    productId: i.product_id ?? "",
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    image: i.image ?? "",
  }));

  if (wasFailed && items.length > 0) {
    // The failed handler restored this order's stock — take it back.
    const result = await decrementStock(items);
    if (!result.ok) {
      // Payment is captured; stock ran out meanwhile. Flag for the admin.
      console.error(
        `orders: captured after failure but stock unavailable for "${result.outOfStockName}" — order ${row.id} needs manual review.`,
      );
    }
  }

  return { persisted: true, alreadyPaid: false, order: mapOrderRow(row, items) };
}

/** Webhook payment.failed handler: flip a still-pending Razorpay order to
 *  payment_status=failed and return its reserved stock. Idempotent — the
 *  pending-only filter makes a second delivery (or a failed→captured retry
 *  race) a no-op. */
export async function markOrderPaymentFailed(
  razorpayOrderId: string,
): Promise<{ updated: boolean }> {
  if (isDemoMode) return { updated: false };
  const service = createServiceClient();
  if (!service) {
    console.error(
      "orders: cannot mark payment failed — SUPABASE_SERVICE_ROLE_KEY not set.",
    );
    return { updated: false };
  }

  const { data, error } = await service
    .from("orders")
    .update({ payment_status: "failed" })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("payment_status", "pending")
    .select("id");
  if (error) {
    console.error("orders: mark-failed failed —", error.message);
    return { updated: false };
  }
  const orderId = (data ?? [])[0]?.id as string | undefined;
  if (!orderId) return { updated: false };

  const { data: items } = await service
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  if (items && items.length > 0) {
    const { error: rpcError } = await service.rpc("restore_stock", { items });
    if (rpcError) {
      console.error("orders: restore_stock failed —", rpcError.message);
    }
  }
  return { updated: true };
}
