import "server-only";
import {
  GSTIN,
  LEGAL_ENTITY_NAME,
  SHIPROCKET_PARCEL,
  SHIPROCKET_PICKUP_LOCATION,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  isShiprocketConfigured,
} from "@/lib/config";
import type { Order, OrderStatus } from "@/lib/types";

/** Shiprocket API client — shipment creation, AWB assignment, tracking and
 *  cancellation.
 *
 *  Server-only: the credentials are a plain email/password pair that mints a
 *  bearer token with full account access, so nothing here may ever reach the
 *  browser.
 *
 *  Design rules that mirror the rest of the codebase:
 *  - Every function is a no-op returning a typed failure when Shiprocket is
 *    not configured. The store must work identically without credentials.
 *  - Nothing here ever throws. Shipping is an auxiliary concern; a Shiprocket
 *    outage must never break checkout, the admin panel, or a cron run.
 *  - Money stays integer paise internally; Shiprocket wants rupees, so the
 *    conversion happens once, at the boundary, in `toRupees`.
 */

const API = "https://apiv2.shiprocket.in/v1/external";

// ── Auth: token cache ─────────────────────────────────────────────────
// Shiprocket tokens are valid for 10 days and the login endpoint is
// aggressively rate-limited, so a token is cached in module scope and
// reused across invocations that share a warm serverless instance.

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}
let cachedToken: CachedToken | null = null;
/** In-flight login, so concurrent callers share one request instead of
 *  stampeding the rate-limited login endpoint. */
let loginInFlight: Promise<string | null> | null = null;

/** Refresh a day before the nominal 10-day expiry. */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

async function login(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("shiprocket: login failed —", res.status, await safeText(res));
      return null;
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      console.error("shiprocket: login response had no token");
      return null;
    }
    cachedToken = { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return data.token;
  } catch (err) {
    console.error("shiprocket: login threw —", (err as Error).message);
    return null;
  }
}

async function getToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  // Collapse concurrent logins into one.
  if (!loginInFlight) {
    loginInFlight = login().finally(() => {
      loginInFlight = null;
    });
  }
  return loginInFlight;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 400);
  } catch {
    return "(unreadable body)";
  }
}

/** Authenticated request helper. Retries once on 401 with a fresh token,
 *  since a cached token can be revoked server-side at any time. */
async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Shiprocket is not configured." };

  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (res.status === 401 && retry) {
      cachedToken = null; // force a fresh login
      return api<T>(path, init, false);
    }

    const text = await safeText(res);
    if (!res.ok) {
      console.error(`shiprocket: ${path} → ${res.status}`, text);
      return { ok: false, error: extractMessage(text, res.status) };
    }

    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, error: "Shiprocket returned an unreadable response." };
    }
  } catch (err) {
    console.error(`shiprocket: ${path} threw —`, (err as Error).message);
    return { ok: false, error: "Could not reach Shiprocket. Please try again." };
  }
}

/** Pull a human-usable message out of a Shiprocket error body. Their errors
 *  come back in several shapes, so fall back to a generic line. */
function extractMessage(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as {
      message?: string;
      errors?: Record<string, string[] | string> | string;
    };
    if (typeof parsed.errors === "string" && parsed.errors.trim())
      return parsed.errors.trim();
    if (parsed.errors && typeof parsed.errors === "object") {
      const first = Object.values(parsed.errors).flat().filter(Boolean)[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
    if (parsed.message?.trim()) return parsed.message.trim();
  } catch {
    // not JSON — fall through
  }
  return `Shiprocket request failed (HTTP ${status}).`;
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Paise → rupees, rounded to 2dp. Shiprocket rejects sub-paise floats. */
function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/** Shiprocket wants a bare 10-digit Indian mobile number. */
function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/** Their address lines have a hard limit and reject empty strings. */
function line(value: string | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  return (v || fallback).slice(0, 180);
}

// ── Status mapping ────────────────────────────────────────────────────

/** Shiprocket status → our OrderStatus. Their vocabulary is large and they
 *  add to it, so this maps the states we act on and returns null for
 *  everything else (meaning "record the raw status, change nothing"). */
export function mapShiprocketStatus(raw: string): OrderStatus | null {
  const s = (raw || "").trim().toUpperCase();
  if (!s) return null;

  // Delivered.
  if (s === "DELIVERED") return "delivered";

  // Anything that means "it's moving" maps to shipped.
  const inTransit = [
    "SHIPPED",
    "IN TRANSIT",
    "OUT FOR DELIVERY",
    "PICKED UP",
    "PICKUP GENERATED",
    "PICKUP QUEUED",
    "PICKUP SCHEDULED",
    "READY TO SHIP",
    "REACHED AT DESTINATION HUB",
    "REACHED DESTINATION HUB",
    "MISROUTED",
    "IN TRANSIT-EN ROUTE",
    "OUT FOR PICKUP",
  ];
  if (inTransit.includes(s)) return "shipped";

  // Terminal failures. RTO (return to origin) means the parcel is coming
  // back to us — the customer is not getting it, so the order is cancelled.
  // "UNDELIVERED" is deliberately NOT here: it's a failed delivery ATTEMPT
  // (NDR) that couriers re-attempt, and often ends in delivery. Cancelling
  // on it would be premature and irreversible (cancelled is sticky and the
  // order drops out of the sync poll) — so it maps to null: the raw status
  // is recorded for the admin, the order status stays put.
  const cancelled = [
    "CANCELED",
    "CANCELLED",
    "RTO INITIATED",
    "RTO DELIVERED",
    "RTO ACKNOWLEDGED",
    "RTO IN TRANSIT",
    "LOST",
    "DAMAGED",
  ];
  if (cancelled.includes(s)) return "cancelled";

  return null;
}

/** Public tracking URL for an AWB. Shiprocket's own tracking page works
 *  without auth and shows the courier's scan history. */
export function trackingUrlForAwb(awb: string): string {
  return `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
}

// ── Result types ──────────────────────────────────────────────────────

export interface CreateShipmentResult {
  ok: boolean;
  error?: string;
  shiprocketOrderId?: string;
  shipmentId?: string;
}

export interface AssignAwbResult {
  ok: boolean;
  error?: string;
  awbNumber?: string;
  courier?: string;
  trackingUrl?: string;
}

export interface TrackingResult {
  ok: boolean;
  error?: string;
  /** Raw Shiprocket status string, e.g. "OUT FOR DELIVERY". */
  rawStatus?: string;
  /** Mapped to our vocabulary, or null when it has no equivalent. */
  status?: OrderStatus | null;
  deliveredAt?: string | null;
}

// ── Operations ────────────────────────────────────────────────────────

/** Create a Shiprocket order for one of our orders (adhoc endpoint).
 *  Idempotency is the caller's job: pass an order that has no
 *  shiprocket_order_id yet. */
export async function createShipment(
  order: Order,
): Promise<CreateShipmentResult> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  const a = order.shippingAddress;
  const pincode = (a.pincode || "").replace(/\D/g, "");
  if (pincode.length !== 6)
    return { ok: false, error: "Shipping pincode must be 6 digits." };
  const phone = normalizePhone(a.phone || order.phone);
  if (phone.length !== 10)
    return { ok: false, error: "Shipping phone must be a 10-digit number." };
  if (!order.items.length)
    return { ok: false, error: "Order has no items to ship." };

  // Shiprocket splits the name; give it something sane for single-word names.
  const nameParts = (a.name || "Customer").trim().split(/\s+/);
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || ".";

  // COD orders declare the amount to collect; prepaid declares 0.
  const isCod = order.paymentMethod === "cod";

  const payload = {
    order_id: order.orderNumber,
    order_date: new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: SHIPROCKET_PICKUP_LOCATION,
    channel_id: "",
    comment: `${LEGAL_ENTITY_NAME} — ${order.orderNumber}`,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: line(a.line1, "Address line 1"),
    billing_address_2: line(a.line2, ""),
    billing_city: line(a.city, "City"),
    billing_pincode: pincode,
    billing_state: line(a.state, "State"),
    billing_country: "India",
    billing_email: order.email,
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.name.slice(0, 120),
      sku: item.productId,
      units: item.quantity,
      selling_price: toRupees(item.price),
      discount: 0,
      tax: "",
      hsn: "",
    })),
    payment_method: isCod ? "COD" : "Prepaid",
    shipping_charges: toRupees(order.shippingFee),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: toRupees(order.subtotal),
    length: SHIPROCKET_PARCEL.lengthCm,
    breadth: SHIPROCKET_PARCEL.breadthCm,
    height: SHIPROCKET_PARCEL.heightCm,
    weight: SHIPROCKET_PARCEL.weightKg,
    ...(GSTIN.trim() ? { seller_gstin: GSTIN.trim() } : {}),
  };

  const res = await api<{
    order_id?: number | string;
    shipment_id?: number | string;
    status?: string;
    message?: string;
  }>("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) return { ok: false, error: res.error };

  const shiprocketOrderId = res.data.order_id?.toString();
  const shipmentId = res.data.shipment_id?.toString();
  if (!shiprocketOrderId || !shipmentId) {
    return {
      ok: false,
      error: res.data.message || "Shiprocket did not return a shipment id.",
    };
  }
  return { ok: true, shiprocketOrderId, shipmentId };
}

/** Assign an AWB (books the courier). Shiprocket picks the courier when
 *  courierId is omitted, using the account's configured priority rules. */
export async function assignAwb(
  shipmentId: string,
  courierId?: string,
): Promise<AssignAwbResult> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  const res = await api<{
    awb_assign_status?: number;
    response?: {
      data?: {
        awb_code?: string | number;
        courier_name?: string;
        courier_company_id?: number;
      };
      message?: string;
    };
    message?: string;
  }>("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: Number(shipmentId),
      ...(courierId ? { courier_id: Number(courierId) } : {}),
    }),
  });

  if (!res.ok) return { ok: false, error: res.error };

  const data = res.data.response?.data;
  const awb = data?.awb_code?.toString();
  if (!awb) {
    return {
      ok: false,
      error:
        res.data.response?.message ||
        res.data.message ||
        "Shiprocket could not assign an AWB (no courier available for this pincode?).",
    };
  }
  return {
    ok: true,
    awbNumber: awb,
    courier: data?.courier_name?.trim() || "Shiprocket",
    trackingUrl: trackingUrlForAwb(awb),
  };
}

/** Current status for an AWB. */
export async function trackByAwb(awb: string): Promise<TrackingResult> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  const res = await api<Record<string, unknown>>(
    `/courier/track/awb/${encodeURIComponent(awb)}`,
  );
  if (!res.ok) return { ok: false, error: res.error };

  // The tracking payload is inconsistently shaped: sometimes
  // { tracking_data: {...} }, sometimes keyed by AWB. Probe defensively.
  const root = res.data as {
    tracking_data?: {
      shipment_status?: string | number;
      shipment_track?: Array<{
        current_status?: string;
        delivered_date?: string | null;
        edd?: string | null;
      }>;
    };
  };
  const td =
    root.tracking_data ??
    (Object.values(res.data).find(
      (v) => v && typeof v === "object" && "tracking_data" in (v as object),
    ) as { tracking_data?: NonNullable<typeof root.tracking_data> } | undefined)
      ?.tracking_data;

  const track = td?.shipment_track?.[0];
  const rawStatus =
    track?.current_status?.toString().trim() ||
    (typeof td?.shipment_status === "string" ? td.shipment_status.trim() : "");

  if (!rawStatus)
    return { ok: false, error: "Shiprocket returned no tracking status yet." };

  const mapped = mapShiprocketStatus(rawStatus);
  const deliveredRaw = track?.delivered_date;
  let deliveredAt: string | null = null;
  if (mapped === "delivered") {
    const parsed = deliveredRaw ? new Date(deliveredRaw) : null;
    deliveredAt =
      parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toISOString()
        : new Date().toISOString();
  }

  return { ok: true, rawStatus, status: mapped, deliveredAt };
}

/** Cancel a shipment already booked with Shiprocket. Used when an order is
 *  cancelled or refunded after the shipment was created. */
export async function cancelShipment(
  awbOrShiprocketOrderId: { awb?: string | null; shiprocketOrderId?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  // Prefer cancelling by AWB (releases the courier booking). Fall back to
  // cancelling the Shiprocket order when no AWB was ever assigned.
  const { awb, shiprocketOrderId } = awbOrShiprocketOrderId;
  if (awb) {
    const res = await api<{ message?: string }>("/orders/cancel/shipment/awbs", {
      method: "POST",
      body: JSON.stringify({ awbs: [awb] }),
    });
    if (res.ok) return { ok: true };
    // Fall through to order-level cancel if AWB cancel failed but we have an id.
    if (!shiprocketOrderId) return { ok: false, error: res.error };
  }

  if (!shiprocketOrderId)
    return { ok: false, error: "Nothing to cancel at Shiprocket." };

  const res = await api<{ message?: string }>("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: [Number(shiprocketOrderId)] }),
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Serviceability + rate check for a destination pincode. Used by the PDP /
 *  cart "delivers to your pincode?" check. */
export interface ServiceabilityResult {
  ok: boolean;
  error?: string;
  serviceable?: boolean;
  /** Estimated days in transit, when Shiprocket provides it. */
  etaDays?: number | null;
  codAvailable?: boolean;
}

export async function checkServiceability(
  deliveryPincode: string,
  opts: { cod?: boolean; weightKg?: number } = {},
): Promise<ServiceabilityResult> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };

  const pickup = process.env.SHIPROCKET_PICKUP_PINCODE?.replace(/\D/g, "");
  const to = (deliveryPincode || "").replace(/\D/g, "");
  if (to.length !== 6) return { ok: false, error: "Enter a 6-digit pincode." };
  if (!pickup || pickup.length !== 6)
    return { ok: false, error: "Pickup pincode is not configured." };

  const params = new URLSearchParams({
    pickup_postcode: pickup,
    delivery_postcode: to,
    cod: opts.cod ? "1" : "0",
    weight: String(opts.weightKg ?? SHIPROCKET_PARCEL.weightKg),
  });

  const res = await api<{
    data?: {
      available_courier_companies?: Array<{
        estimated_delivery_days?: string | number;
        cod?: number | boolean;
      }>;
    };
  }>(`/courier/serviceability/?${params.toString()}`);

  if (!res.ok) return { ok: false, error: res.error };

  const couriers = res.data.data?.available_courier_companies ?? [];
  if (!couriers.length) return { ok: true, serviceable: false };

  const days = couriers
    .map((c) => Number(c.estimated_delivery_days))
    .filter((n) => Number.isFinite(n) && n > 0);

  return {
    ok: true,
    serviceable: true,
    etaDays: days.length ? Math.min(...days) : null,
    codAvailable: couriers.some((c) => c.cod === 1 || c.cod === true),
  };
}

/** Convenience for the "ship this order" admin button and the auto-ship
 *  path: create the shipment then immediately book a courier. Returns the
 *  partial result when AWB assignment fails, so the caller can still persist
 *  the shipment ids and retry the AWB later. */
export interface ShipNowResult {
  ok: boolean;
  error?: string;
  shiprocketOrderId?: string;
  shipmentId?: string;
  awbNumber?: string;
  courier?: string;
  trackingUrl?: string;
}

export async function createShipmentAndAssignAwb(
  order: Order,
): Promise<ShipNowResult> {
  const created = await createShipment(order);
  if (!created.ok || !created.shipmentId) {
    return { ok: false, error: created.error };
  }

  const awb = await assignAwb(created.shipmentId);
  if (!awb.ok) {
    // Shipment exists but no courier yet — surface the ids so they get saved.
    return {
      ok: false,
      error: awb.error,
      shiprocketOrderId: created.shiprocketOrderId,
      shipmentId: created.shipmentId,
    };
  }

  return {
    ok: true,
    shiprocketOrderId: created.shiprocketOrderId,
    shipmentId: created.shipmentId,
    awbNumber: awb.awbNumber,
    courier: awb.courier,
    trackingUrl: awb.trackingUrl,
  };
}

/** Exposed for the admin "test connection" button — proves the credentials
 *  work without creating anything. */
export async function pingShiprocket(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isShiprocketConfigured)
    return { ok: false, error: "Shiprocket is not configured." };
  const token = await getToken();
  if (!token) return { ok: false, error: "Shiprocket login failed — check credentials." };
  return { ok: true };
}

/** Support contact appended to customer-facing shipping copy. */
export const SHIPROCKET_SUPPORT_LINE = `Questions about delivery? ${SUPPORT_EMAIL} · ${SUPPORT_PHONE} · ${SITE_URL}`;
