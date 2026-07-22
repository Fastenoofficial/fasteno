import {
  GST_RATE,
  GSTIN,
  LEGAL_ADDRESS,
  LEGAL_ENTITY_NAME,
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
 *  taxable, split half CGST / half SGST (intra-state assumption for v1). */

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
  cgst: number; // paise
  sgst: number; // paise
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
  gstRate: number; // e.g. 12
  halfRate: number; // e.g. 6 (CGST/SGST each)
  lines: InvoiceLine[];
  /** Sums over `lines` (items + shipping). */
  totals: { taxable: number; cgst: number; sgst: number; gross: number };
  discount: number; // paise, 0 when none
  grandTotal: number; // paise — the amount actually charged (order.total)
}

// ── Builder ────────────────────────────────────────────────────────────

/** GST-inclusive back-calculation for one gross amount (paise). */
function splitGst(gross: number): {
  taxable: number;
  cgst: number;
  sgst: number;
} {
  const taxable = Math.round(gross / (1 + GST_RATE / 100));
  const gst = gross - taxable;
  const cgst = Math.round(gst / 2);
  return { taxable, cgst, sgst: gst - cgst };
}

export function buildInvoiceData(order: InvoiceOrder): InvoiceData {
  const lines: InvoiceLine[] = order.items.map((item) => {
    const gross = item.price * item.quantity;
    return {
      description: item.name,
      hsnCode: (item.hsnCode ?? item.hsn_code ?? "").trim(),
      quantity: item.quantity,
      unitPrice: item.price,
      gross,
      ...splitGst(gross),
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
      ...splitGst(order.shippingFee),
    });
  }

  const totals = lines.reduce(
    (t, l) => ({
      taxable: t.taxable + l.taxable,
      cgst: t.cgst + l.cgst,
      sgst: t.sgst + l.sgst,
      gross: t.gross + l.gross,
    }),
    { taxable: 0, cgst: 0, sgst: 0, gross: 0 },
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
    gstRate: GST_RATE,
    halfRate: GST_RATE / 2,
    lines,
    totals,
    discount: order.discount ?? 0,
    grandTotal: order.total,
  };
}
