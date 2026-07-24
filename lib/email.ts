import {
  LEGAL_ENTITY_NAME,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/lib/config";
import { formatDate, formatINR } from "@/lib/format";

/** Transactional email via Resend.
 *
 *  - No-ops silently when RESEND_API_KEY is absent (demo mode / local dev).
 *  - NEVER throws — checkout and fulfilment flows must not break because an
 *    email failed; errors are logged with console.error instead.
 *  - Server-only usage (API routes / server actions) — the SDK is imported
 *    lazily so it never lands in a client bundle.
 */

// ── Structural order type (decoupled from other modules' exports) ─────

export interface EmailOrderItem {
  name: string;
  price: number; // paise, unit price
  quantity: number;
}

export interface EmailOrderAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface EmailOrder {
  id: string;
  orderNumber: string;
  email: string;
  items: EmailOrderItem[];
  subtotal: number; // paise
  shippingFee: number; // paise
  discount?: number; // paise
  total: number; // paise
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: EmailOrderAddress;
  courier?: string | null;
  awbNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: string; // ISO
}

export type OrderEmailKind = "confirmation" | "shipped";

// ── Brand palette (inline styles only — email clients strip <style>) ──

const INK = "#F9F8F4"; // warm ivory paper — page background
const SURFACE = "#FFFFFF"; // card
const LINE = "#E2E0DA"; // hairlines
const IVORY = "#1A1C1C"; // primary text — deep charcoal (slot name kept)
const MUTED = "#55585A"; // secondary text
const GOLD = "#7A6018"; // antique gold, contrast-safe on paper
const BLOCK = "#1A1C1C"; // charcoal color-block (header band, CTA)
const BLOCK_TEXT = "#F1F1EE"; // text on charcoal blocks
const GOLD_LIGHT = "#CAA829"; // decorative gold on charcoal

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "Paid online (Razorpay)",
  cod: "Cash on Delivery — payable when your order arrives",
  demo: "Demo payment (simulated)",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paymentLabel(method: string): string {
  return PAYMENT_LABEL[method] ?? method;
}

function addressHtml(a: EmailOrderAddress): string {
  return `
    <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};">
      <span style="color:${IVORY};">${esc(a.name)}</span><br/>
      ${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ""}<br/>
      ${esc(a.city)}, ${esc(a.state)} — ${esc(a.pincode)}
    </p>`;
}

function addressText(a: EmailOrderAddress): string {
  return [
    a.name,
    `${a.line1}${a.line2 ? `, ${a.line2}` : ""}`,
    `${a.city}, ${a.state} — ${a.pincode}`,
  ].join("\n");
}

function eyebrow(label: string): string {
  return `<p style="margin:0 0 8px;font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};font-weight:600;">${label}</p>`;
}

function ctaButton(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
      <tr>
        <td style="background-color:${BLOCK};">
          <a href="${esc(href)}"
             style="display:inline-block;padding:13px 32px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${BLOCK_TEXT};text-decoration:none;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

function itemsTableHtml(items: EmailOrderItem[]): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:13px;color:${IVORY};line-height:1.5;">
          ${esc(i.name)}
          <span style="color:${MUTED};">&nbsp;×&nbsp;${i.quantity}</span>
        </td>
        <td align="right" style="padding:12px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:13px;color:${IVORY};white-space:nowrap;">
          ${formatINR(i.price * i.quantity)}
        </td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
      ${rows}
    </table>`;
}

function totalsHtml(order: EmailOrder): string {
  const discount = order.discount ?? 0;
  const row = (label: string, value: string, opts?: { color?: string }) => `
    <tr>
      <td style="padding:5px 0;font-family:${SANS};font-size:13px;color:${MUTED};">${label}</td>
      <td align="right" style="padding:5px 0;font-family:${SANS};font-size:13px;color:${opts?.color ?? IVORY};white-space:nowrap;">${value}</td>
    </tr>`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      ${row("Subtotal", formatINR(order.subtotal))}
      ${discount > 0 ? row("Discount", `− ${formatINR(discount)}`, { color: GOLD }) : ""}
      ${row("Shipping", order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee))}
      <tr>
        <td style="padding:12px 0 2px;border-top:1px solid ${LINE};font-family:${SERIF};font-size:16px;color:${IVORY};">Total</td>
        <td align="right" style="padding:12px 0 2px;border-top:1px solid ${LINE};font-family:${SERIF};font-size:18px;color:${GOLD};white-space:nowrap;">${formatINR(order.total)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:2px 0 0;font-family:${SANS};font-size:11px;color:${MUTED};">Inclusive of GST.</td>
      </tr>
    </table>`;
}

/** Shared Modern Heritage shell: centered 600px white card on warm ivory
 *  paper, opened by a charcoal color-block header band. */
function shell(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
</head>
<body style="margin:0;padding:0;background-color:${INK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${INK};">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background-color:${SURFACE};border:1px solid ${LINE};">
          <tr>
            <td align="center" style="padding:30px 32px 26px;background-color:${BLOCK};">
              <div style="font-family:${SERIF};font-size:22px;letter-spacing:5px;color:${BLOCK_TEXT};">${SITE_NAME.toUpperCase()}</div>
              <div style="margin-top:7px;font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${GOLD_LIGHT};">${esc(SITE_TAGLINE)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 32px;border-top:1px solid ${LINE};">
              <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.8;color:${MUTED};">
                ${esc(LEGAL_ENTITY_NAME)} &nbsp;·&nbsp; <a href="mailto:${SUPPORT_EMAIL}" style="color:${GOLD};text-decoration:none;">${SUPPORT_EMAIL}</a> &nbsp;·&nbsp; ${esc(SUPPORT_PHONE)}<br/>
                This email concerns your order at <a href="${SITE_URL}" style="color:${MUTED};text-decoration:underline;">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Confirmation email ─────────────────────────────────────────────────

function confirmationEmail(order: EmailOrder): {
  subject: string;
  html: string;
  text: string;
} {
  const orderUrl = `${SITE_URL}/order/${order.id}`;
  const subject = `Order ${order.orderNumber} confirmed — ${SITE_NAME}`;

  const body = `
    ${eyebrow("Order confirmed")}
    <h1 style="margin:0;font-family:${SERIF};font-size:26px;font-weight:normal;line-height:1.3;color:${IVORY};">Thank you. Your order is in hand.</h1>
    <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};">
      Order <span style="color:${GOLD};font-weight:600;">${esc(order.orderNumber)}</span>
      was placed on ${esc(formatDate(order.createdAt))}. We&rsquo;ll take it from here.
    </p>

    <div style="margin-top:28px;">
      ${eyebrow("Items in this order")}
      ${itemsTableHtml(order.items)}
      ${totalsHtml(order)}
    </div>

    <div style="margin-top:28px;">
      ${eyebrow("Delivering to")}
      ${addressHtml(order.shippingAddress)}
    </div>

    <div style="margin-top:24px;">
      ${eyebrow("Payment")}
      <p style="margin:0;font-family:${SANS};font-size:13px;color:${IVORY};">${esc(paymentLabel(order.paymentMethod))}</p>
    </div>

    ${ctaButton(orderUrl, "View your order")}
  `;

  const discount = order.discount ?? 0;
  const text = [
    `${SITE_NAME} — Order confirmed`,
    ``,
    `Thank you. Order ${order.orderNumber} was placed on ${formatDate(order.createdAt)}.`,
    ``,
    `Items:`,
    ...order.items.map(
      (i) => `  - ${i.name} × ${i.quantity} — ${formatINR(i.price * i.quantity)}`,
    ),
    ``,
    `Subtotal: ${formatINR(order.subtotal)}`,
    ...(discount > 0 ? [`Discount: -${formatINR(discount)}`] : []),
    `Shipping: ${order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}`,
    `Total: ${formatINR(order.total)} (inclusive of GST)`,
    ``,
    `Payment: ${paymentLabel(order.paymentMethod)}`,
    ``,
    `Delivering to:`,
    addressText(order.shippingAddress),
    ``,
    `View your order: ${orderUrl}`,
    ``,
    `${LEGAL_ENTITY_NAME} · ${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`,
  ].join("\n");

  return { subject, html: shell(`Order ${order.orderNumber} confirmed — thank you.`, body), text };
}

// ── Shipped email ──────────────────────────────────────────────────────

function shippedEmail(order: EmailOrder): {
  subject: string;
  html: string;
  text: string;
} {
  const orderUrl = `${SITE_URL}/order/${order.id}`;
  const subject = `Order ${order.orderNumber} is on its way — ${SITE_NAME}`;
  const courier = order.courier?.trim() || "our courier partner";
  const awb = order.awbNumber?.trim() || "";
  const trackingUrl = order.trackingUrl?.trim() || "";

  const itemsSummary = order.items
    .map(
      (i) => `
      <li style="margin:4px 0;font-family:${SANS};font-size:13px;color:${IVORY};">
        ${esc(i.name)} <span style="color:${MUTED};">× ${i.quantity}</span>
      </li>`,
    )
    .join("");

  const body = `
    ${eyebrow("Shipped")}
    <h1 style="margin:0;font-family:${SERIF};font-size:26px;font-weight:normal;line-height:1.3;color:${IVORY};">Your order is on its way.</h1>
    <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};">
      Order <span style="color:${GOLD};font-weight:600;">${esc(order.orderNumber)}</span>
      has been dispatched via <span style="color:${IVORY};">${esc(courier)}</span>.
      ${awb ? `Airway bill (AWB): <span style="color:${IVORY};">${esc(awb)}</span>.` : ""}
    </p>

    ${trackingUrl ? ctaButton(trackingUrl, "Track your shipment") : ""}

    <div style="margin-top:28px;">
      ${eyebrow("In this shipment")}
      <ul style="margin:6px 0 0;padding-left:18px;">${itemsSummary}</ul>
    </div>

    <div style="margin-top:26px;">
      ${eyebrow("Delivering to")}
      ${addressHtml(order.shippingAddress)}
    </div>

    <p style="margin:26px 0 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED};">
      You can review the full order any time:
      <a href="${esc(orderUrl)}" style="color:${GOLD};text-decoration:none;">${esc(order.orderNumber)}</a>
    </p>
  `;

  const text = [
    `${SITE_NAME} — Order shipped`,
    ``,
    `Order ${order.orderNumber} has been dispatched via ${courier}.`,
    ...(awb ? [`AWB: ${awb}`] : []),
    ...(trackingUrl ? [`Track: ${trackingUrl}`] : []),
    ``,
    `In this shipment:`,
    ...order.items.map((i) => `  - ${i.name} × ${i.quantity}`),
    ``,
    `Delivering to:`,
    addressText(order.shippingAddress),
    ``,
    `Order details: ${orderUrl}`,
    ``,
    `${LEGAL_ENTITY_NAME} · ${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`,
  ].join("\n");

  return { subject, html: shell(`Order ${order.orderNumber} shipped via ${courier}.`, body), text };
}

// ── Owner "new order" alert ────────────────────────────────────────────

function ownerAlertEmail(order: EmailOrder): {
  subject: string;
  html: string;
  text: string;
} {
  const adminUrl = `${SITE_URL}/admin/orders/${order.id}`;
  const codTag = order.paymentMethod === "cod" ? "COD" : "Paid online";
  const subject = `New order ${order.orderNumber} — ${formatINR(order.total)} (${codTag})`;

  const body = `
    ${eyebrow("New order received")}
    <h1 style="margin:0;font-family:${SERIF};font-size:24px;font-weight:normal;line-height:1.3;color:${IVORY};">${esc(order.orderNumber)} · ${formatINR(order.total)}</h1>
    <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${MUTED};">
      Placed ${esc(formatDate(order.createdAt))} ·
      <span style="color:${IVORY};">${esc(paymentLabel(order.paymentMethod))}</span><br/>
      Customer: <a href="mailto:${esc(order.email)}" style="color:${GOLD};text-decoration:none;">${esc(order.email)}</a>
    </p>

    <div style="margin-top:24px;">
      ${eyebrow("Items")}
      ${itemsTableHtml(order.items)}
      ${totalsHtml(order)}
    </div>

    <div style="margin-top:24px;">
      ${eyebrow("Ship to")}
      ${addressHtml(order.shippingAddress)}
    </div>

    ${ctaButton(adminUrl, "Open in admin")}
  `;

  const text = [
    `New order ${order.orderNumber} — ${formatINR(order.total)} (${codTag})`,
    ``,
    `Placed: ${formatDate(order.createdAt)}`,
    `Payment: ${paymentLabel(order.paymentMethod)}`,
    `Customer: ${order.email}`,
    ``,
    `Items:`,
    ...order.items.map(
      (i) => `  - ${i.name} × ${i.quantity} — ${formatINR(i.price * i.quantity)}`,
    ),
    `Total: ${formatINR(order.total)}`,
    ``,
    `Ship to:`,
    addressText(order.shippingAddress),
    ``,
    `Manage: ${adminUrl}`,
  ].join("\n");

  return {
    subject,
    html: shell(`${order.orderNumber} · ${formatINR(order.total)} · ${codTag}`, body),
    text,
  };
}

// ── Public API ─────────────────────────────────────────────────────────

/** Send a transactional order email. Silently no-ops without
 *  RESEND_API_KEY; logs (never throws) on failure. */
export async function sendOrderEmail(
  order: EmailOrder,
  kind: OrderEmailKind,
): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return; // demo mode / email not configured — no-op

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from =
      process.env.EMAIL_FROM ?? "Fasteno Shyama <orders@fasteno.in>";

    const { subject, html, text } =
      kind === "confirmation" ? confirmationEmail(order) : shippedEmail(order);

    const { error } = await resend.emails.send({
      from,
      to: order.email,
      replyTo: SUPPORT_EMAIL,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(
        `email: ${kind} send failed for ${order.orderNumber} —`,
        error.message ?? error,
      );
    }
  } catch (err) {
    console.error(`email: ${kind} send failed —`, err);
  }
}

/** Alert the store owner that a real order landed (COD placement or online
 *  payment capture). Goes to ORDER_NOTIFY_EMAIL, falling back to
 *  SUPPORT_EMAIL; reply-to is the customer so a reply reaches them directly.
 *  Same guarantees as sendOrderEmail: no-op without RESEND_API_KEY, never
 *  throws. */
export async function sendOwnerOrderAlert(order: EmailOrder): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const to = process.env.ORDER_NOTIFY_EMAIL?.trim() || SUPPORT_EMAIL;
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from =
      process.env.EMAIL_FROM ?? "Fasteno Shyama <orders@fasteno.in>";

    const { subject, html, text } = ownerAlertEmail(order);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: order.email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(
        `email: owner alert failed for ${order.orderNumber} —`,
        error.message ?? error,
      );
    }
  } catch (err) {
    console.error("email: owner alert failed —", err);
  }
}
