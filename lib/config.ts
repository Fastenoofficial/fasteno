/** Site-wide configuration and live/demo mode detection. */

export const SITE_NAME = "Fasteno Shyama";
export const SITE_TAGLINE = "The finishing touch.";
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

/** Demo mode = no Supabase project connected. The storefront runs fully
 *  from bundled seed data and checkout simulates payment. */
export const isDemoMode = !isSupabaseConfigured;

export const SUPPORT_EMAIL = "care@fastenoshyama.in";
export const SUPPORT_PHONE = "+91 98765 43210";

/** WhatsApp support number in wa.me format (digits only, country code, no +). */
export const WHATSAPP_NUMBER = "919876543210";

/** ── Legal / compliance (Consumer Protection E-Commerce Rules 2020) ──
 *  TODO(owner): replace placeholders with the real registered details
 *  before going live. */
export const LEGAL_ENTITY_NAME = "Fasteno Shyama";
export const LEGAL_ADDRESS =
  "Registered address: [update in lib/config.ts], New Delhi, India";
export const GSTIN = ""; // e.g. "07AAAAA0000A1Z5" — shown on invoices when set
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
