import {
  GST_RATE,
  GSTIN,
  LEGAL_ADDRESS,
  LEGAL_ENTITY_NAME,
  SELLER_STATE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/lib/config";
import { formatDate } from "@/lib/format";

/** Invoice-data builder — maps an order to the fields a GST tax invoice
 *  needs. Pure + isomorphic (no server-only imports): the printable invoice
 *  page uses it on the server for live orders and in a client island for
 *  demo/guest orders read from localStorage.
 *
 *  All money stays integer paise. Catalogue prices are GST-INCLUSIVE at
 *  GST_RATE, so per line: taxable = round(gross / (1 + rate)), gst = gross −
 *  taxable. Delivery within SELLER_STATE splits the tax half CGST / half
 *  SGST; delivery to any other state is an inter-state supply and carries
 *  IGST at the full rate instead. */

// ── Structural order type (decoupled from other modules' exports) ─────

export interface InvoiceOrderItem {
  name: string;
  price: number; // paise, unit price (GST-inclusive)
  quantity: number;
  /** HSN code if the catalogue provides one (either naming convention). */
  hsnCode?: string | null;
  hsn_code?: string | null;
}

export interface InvoiceOrderAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
}

export interface InvoiceOrder {
  id: string;
  orderNumber: string;
  email: string;
  phone?: string;
  items: InvoiceOrderItem[];
  subtotal: number; // paise
  shippingFee: number; // paise
  discount?: number; // paise
  total: number; // paise
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: InvoiceOrderAddress;
  createdAt: string; // ISO
}

// ── Invoice shape ──────────────────────────────────────────────────────

export interface InvoiceLine {
  description: string;
  hsnCode: string; // blank when unknown
  quantity: number;
  unitPrice: number; // paise, GST-inclusive
  gross: number; // paise — unitPrice × quantity
  taxable: number; // paise
  cgst: number; // paise, 0 on inter-state invoices
  sgst: number; // paise, 0 on inter-state invoices
  igst: number; // paise, 0 on intra-state invoices
}

export interface InvoiceParty {
  name: string;
  addressLines: string[];
  gstin?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceData {
  /** "TAX INVOICE" when a GSTIN is configured, otherwise "INVOICE". */
  title: "TAX INVOICE" | "INVOICE";
  invoiceNumber: string; // = order number
  orderId: string;
  orderNumber: string;
  date: string; // formatted, en-IN
  seller: InvoiceParty;
  buyer: InvoiceParty;
  paymentMethod: string;
  paymentStatus: string;
  /** Buyer's state — shown as GST place of supply. */
  placeOfSupply: string;
  /** True when the place of supply is outside SELLER_STATE → IGST. */
  interState: boolean;
  gstRate: number; // e.g. 12
  halfRate: number; // e.g. 6 (CGST/SGST each)
  lines: InvoiceLine[];
  /** Sums over `lines` (items + shipping). */
  totals: {
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    gross: number;
  };
  discount: number; // paise, 0 when none
  grandTotal: number; // paise — the amount actually charged (order.total)
}

// ── Builder ────────────────────────────────────────────────────────────

/** GST-inclusive back-calculation for one gross amount (paise).
 *  Intra-state → half CGST + half SGST; inter-state → full IGST. */
function splitGst(
  gross: number,
  interState: boolean,
): {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
} {
  const taxable = Math.round(gross / (1 + GST_RATE / 100));
  const gst = gross - taxable;
  if (interState) return { taxable, cgst: 0, sgst: 0, igst: gst };
  const cgst = Math.round(gst / 2);
  return { taxable, cgst, sgst: gst - cgst, igst: 0 };
}

export function buildInvoiceData(order: InvoiceOrder): InvoiceData {
  const interState =
    order.shippingAddress.state.trim().toLowerCase() !==
    SELLER_STATE.trim().toLowerCase();

  // A coupon reduces the amount actually charged, so it reduces the taxable
  // value and the GST with it. Apportion the discount across the item lines
  // pro-rata by gross (largest-remainder, so the parts sum EXACTLY to the
  // discount) and compute GST on the net figure. Without this the invoice
  // overstates collected GST on every discounted order — a filing liability.
  const discount = Math.max(0, Math.min(order.discount ?? 0, order.subtotal));
  const itemGross = order.items.map((i) => i.price * i.quantity);
  const grossSum = itemGross.reduce((a, b) => a + b, 0);
  const share = itemGross.map((g) =>
    grossSum > 0 ? (discount * g) / grossSum : 0,
  );
  const alloc = share.map((s) => Math.floor(s));
  let remainder = discount - alloc.reduce((a, b) => a + b, 0);
  // Hand the leftover paise to the largest fractional parts first.
  for (const idx of share
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i)) {
    if (remainder <= 0) break;
    alloc[idx] += 1;
    remainder -= 1;
  }

  const lines: InvoiceLine[] = order.items.map((item, i) => {
    const net = itemGross[i] - alloc[i];
    return {
      description: item.name,
      hsnCode: (item.hsnCode ?? item.hsn_code ?? "").trim(),
      quantity: item.quantity,
      unitPrice: item.price,
      gross: net,
      ...splitGst(net, interState),
    };
  });

  // Shipping is part of the amount charged — invoice it as its own line so
  // the table ties out to what the customer paid.
  if (order.shippingFee > 0) {
    lines.push({
      description: "Shipping & Handling",
      hsnCode: "",
      quantity: 1,
      unitPrice: order.shippingFee,
      gross: order.shippingFee,
      ...splitGst(order.shippingFee, interState),
    });
  }

  const totals = lines.reduce(
    (t, l) => ({
      taxable: t.taxable + l.taxable,
      cgst: t.cgst + l.cgst,
      sgst: t.sgst + l.sgst,
      igst: t.igst + l.igst,
      gross: t.gross + l.gross,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, gross: 0 },
  );

  const a = order.shippingAddress;
  const gstin = GSTIN.trim();

  return {
    title: gstin ? "TAX INVOICE" : "INVOICE",
    invoiceNumber: order.orderNumber,
    orderId: order.id,
    orderNumber: order.orderNumber,
    date: formatDate(order.createdAt),
    seller: {
      name: LEGAL_ENTITY_NAME,
      addressLines: [LEGAL_ADDRESS],
      gstin: gstin || undefined,
      email: SUPPORT_EMAIL,
      phone: SUPPORT_PHONE,
    },
    buyer: {
      name: a.name,
      addressLines: [
        `${a.line1}${a.line2 ? `, ${a.line2}` : ""}`,
        `${a.city}, ${a.state} — ${a.pincode}`,
      ],
      email: order.email,
      phone: a.phone || order.phone,
    },
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    placeOfSupply: a.state,
    interState,
    gstRate: GST_RATE,
    halfRate: GST_RATE / 2,
    lines,
    totals,
    discount,
    grandTotal: order.total,
  };
}
