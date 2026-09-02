/** Site-wide configuration and live/demo mode detection. */

export const SITE_NAME = "Fasteno.in";
export const SITE_TAGLINE = "Exclusive Accessories";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Free shipping at/above this order subtotal (paise) — ₹1,499. */
export const FREE_SHIPPING_THRESHOLD = 149900;
/** Flat shipping fee below the threshold (paise) — ₹99. */
export const SHIPPING_FEE = 9900;

/** True when Supabase env vars are present (live catalog, auth, orders). */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** True when the public Razorpay key is present (real payment widget). */
export const isRazorpayConfigured = Boolean(
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
);

/** True when Shiprocket API credentials are present. While false, every
 *  Shiprocket code path is inert and the admin keeps entering courier/AWB
 *  by hand — so the store works exactly as before without credentials. */
export const isShiprocketConfigured = Boolean(
  process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD,
);

/** Pickup location nickname as configured in Shiprocket → Settings →
 *  Pickup Addresses. Must match exactly or shipment creation is rejected. */
export const SHIPROCKET_PICKUP_LOCATION =
  process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || "Primary";

/** Parcel defaults used when a product has no per-item dimensions.
 *  Shiprocket bills on volumetric weight, so these should reflect a real
 *  packed parcel rather than being left at zero. */
export const SHIPROCKET_PARCEL = {
  /** kg, per order (a tie/accessory parcel is light). */
  weightKg: Number(process.env.SHIPROCKET_PARCEL_WEIGHT_KG ?? "0.3"),
  lengthCm: Number(process.env.SHIPROCKET_PARCEL_LENGTH_CM ?? "22"),
  breadthCm: Number(process.env.SHIPROCKET_PARCEL_BREADTH_CM ?? "16"),
  heightCm: Number(process.env.SHIPROCKET_PARCEL_HEIGHT_CM ?? "4"),
} as const;

/** Demo mode = no Supabase project connected. The storefront runs fully
 *  from bundled seed data and checkout simulates payment. */
export const isDemoMode = !isSupabaseConfigured;

export const SUPPORT_EMAIL = "care@fasteno.in";
export const SUPPORT_PHONE = "+91 78784 38958";

/** WhatsApp support number in wa.me format (digits only, country code, no +). */
export const WHATSAPP_NUMBER = "917878438958";

/** ── Legal / compliance (Consumer Protection E-Commerce Rules 2020) ──
 *  Registered details per GST certificate (Form GST REG-06, GSTIN below).
 *  "Fasteno Shyama" is the brand; SR Creation is the registered entity. */
export const LEGAL_ENTITY_NAME = "SR Creation (Proprietor: Sandeep Agarwal)";
export const LEGAL_ADDRESS =
  "Shop No. 02, 1st Floor, 2772, Karodiya Bhawan, Poorviyo Ka Chowk, Khajane Walon Ka Rasta, Chandpol Bazar, Jaipur, Rajasthan — 302001";
export const GSTIN = "08CVGPA9527D1ZO";
/** Seller's GST state — decides CGST+SGST (intra-state) vs IGST on invoices. */
export const SELLER_STATE = "Rajasthan";
export const GRIEVANCE_OFFICER = {
  name: "Grievance Officer — Fasteno Shyama",
  email: SUPPORT_EMAIL,
  phone: SUPPORT_PHONE,
  /** Statutory SLA under the E-Commerce Rules 2020 */
  sla: "Complaints are acknowledged within 48 hours and resolved within 30 days.",
};

/** GST rate applied to accessories (prices are GST-inclusive). */
export const GST_RATE = 12;

/** COD guardrail: maximum order total eligible for Cash on Delivery (paise). */
export const COD_MAX_TOTAL = 500000; // ₹5,000

/** True when a transactional-email provider is configured (Resend). */
export const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);

/** True when the service-role key is available (webhooks, refunds, stock). */
export const isServiceRoleConfigured = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
