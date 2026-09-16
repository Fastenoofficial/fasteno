import { formatINR } from "@/lib/format";
import type { InvoiceData } from "@/lib/invoice";

/** Printable invoice sheet — deliberately breaks the dark theme: white
 *  paper, black text, gold brand accent. All styles are inline (plus one
 *  scoped <style> block for print rules) so globals.css stays untouched.
 *  Isomorphic: rendered by the server page (live orders) and inside the
 *  localStorage client island (demo/guest orders). */

const PAPER = "#ffffff";
const TEXT = "#1a1a1a";
const FAINT = "#6b6b6b";
const RULE = "#d9d4c9";
const GOLD = "#a8873d"; // darker gold — legible on white
const SERIF = "var(--font-playfair), Georgia, 'Times New Roman', serif";

const PAYMENT_LABEL: Record<string, string> = {
  razorpay: "Paid online (Razorpay)",
  cod: "Cash on Delivery",
  demo: "Demo payment (simulated)",
};

const th: React.CSSProperties = {
  padding: "8px 8px",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: FAINT,
  borderBottom: `1px solid ${TEXT}`,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "9px 8px",
  fontSize: 12.5,
  color: TEXT,
  borderBottom: `1px solid ${RULE}`,
  textAlign: "right",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: GOLD,
  marginBottom: 6,
};

export function InvoiceView({ data }: { data: InvoiceData }) {
  return (
    <>
      {/* Print rules: hide site chrome + on-screen controls, white page. */}
      <style>{`
        @page { margin: 12mm; }
        @media print {
          body { background: #ffffff !important; }
          body > *:not(main) { display: none !important; }
          .no-print { display: none !important; }
          #invoice-backdrop { background: #ffffff !important; padding: 0 !important; }
          #invoice-sheet { border: none !important; box-shadow: none !important; margin: 0 !important; max-width: none !important; padding: 0 !important; }
        }
      `}</style>

      <div
        id="invoice-sheet"
        style={{
          background: PAPER,
          color: TEXT,
          maxWidth: 800,
          margin: "0 auto",
          padding: "40px 44px 32px",
          border: `1px solid ${RULE}`,
          fontFamily:
            "var(--font-inter), -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            borderBottom: `2px solid ${TEXT}`,
            paddingBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 24,
                letterSpacing: "0.18em",
                color: GOLD,
              }}
            >
              FASTENO
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: FAINT,
              }}
            >
              The finishing touch.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 20,
                letterSpacing: "0.12em",
                color: TEXT,
              }}
            >
              {data.title}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: FAINT }}>
              No. <span style={{ color: TEXT, fontWeight: 600 }}>{data.invoiceNumber}</span>
              {" · "}
              {data.date}
            </div>
          </div>
        </div>

        {/* ── Seller / Buyer ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            marginTop: 22,
          }}
        >
          <div style={{ flex: "1 1 240px", minWidth: 220 }}>
            <div style={label}>Sold by</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{data.seller.name}</div>
            {data.seller.addressLines.map((line) => (
              <div key={line} style={{ fontSize: 12, color: FAINT, marginTop: 2, lineHeight: 1.5 }}>
                {line}
              </div>
            ))}
            {data.seller.gstin && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                GSTIN: <span style={{ fontWeight: 600 }}>{data.seller.gstin}</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: FAINT, marginTop: 4 }}>
              {data.seller.email} · {data.seller.phone}
            </div>
          </div>

          <div style={{ flex: "1 1 240px", minWidth: 220 }}>
            <div style={label}>Billed &amp; shipped to</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{data.buyer.name}</div>
            {data.buyer.addressLines.map((line) => (
              <div key={line} style={{ fontSize: 12, color: FAINT, marginTop: 2, lineHeight: 1.5 }}>
                {line}
              </div>
            ))}
            <div style={{ fontSize: 12, color: FAINT, marginTop: 4 }}>
              {[data.buyer.email, data.buyer.phone].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {/* ── Meta row ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 28px",
            marginTop: 18,
            padding: "10px 12px",
            background: "#f7f5f0",
            border: `1px solid ${RULE}`,
            fontSize: 12,
          }}
        >
          <span>
            <span style={{ color: FAINT }}>Order:</span>{" "}
            <strong>{data.orderNumber}</strong>
          </span>
          <span>
            <span style={{ color: FAINT }}>Place of supply:</span>{" "}
            <strong>{data.placeOfSupply}</strong>
          </span>
          <span>
            <span style={{ color: FAINT }}>Payment:</span>{" "}
            <strong>{PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}</strong>
            {" "}({data.paymentStatus})
          </span>
        </div>

        {/* ── Items table ── */}
        <table
          style={{
            width: "100%",
            marginTop: 22,
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left", width: 24 }}>#</th>
              <th style={{ ...th, textAlign: "left", whiteSpace: "normal" }}>Description</th>
              <th style={{ ...th, textAlign: "left" }}>HSN</th>
              <th style={th}>Qty</th>
              <th style={th}>Rate</th>
              <th style={th}>Taxable</th>
              {data.interState ? (
                <th style={th}>IGST ({data.gstRate}%)</th>
              ) : (
                <>
                  <th style={th}>CGST ({data.halfRate}%)</th>
                  <th style={th}>SGST ({data.halfRate}%)</th>
                </>
              )}
              <th style={th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line, i) => (
              <tr key={`${line.description}-${i}`}>
                <td style={{ ...td, textAlign: "left", color: FAINT }}>{i + 1}</td>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                  {line.description}
                </td>
                <td style={{ ...td, textAlign: "left", color: line.hsnCode ? TEXT : FAINT }}>
                  {line.hsnCode || "—"}
                </td>
                <td style={td}>{line.quantity}</td>
                <td style={td}>{formatINR(line.unitPrice)}</td>
                <td style={td}>{formatINR(line.taxable)}</td>
                {data.interState ? (
                  <td style={td}>{formatINR(line.igst)}</td>
                ) : (
                  <>
                    <td style={td}>{formatINR(line.cgst)}</td>
                    <td style={td}>{formatINR(line.sgst)}</td>
                  </>
                )}
                <td style={{ ...td, fontWeight: 600 }}>{formatINR(line.gross)}</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr>
              <td style={{ ...td, borderBottom: "none" }} />
              <td
                colSpan={4}
                style={{
                  ...td,
                  textAlign: "left",
                  borderBottom: "none",
                  borderTop: `1px solid ${TEXT}`,
                  fontWeight: 600,
                }}
              >
                Total
              </td>
              <td style={{ ...td, borderBottom: "none", borderTop: `1px solid ${TEXT}`, fontWeight: 600 }}>
                {formatINR(data.totals.taxable)}
              </td>
              {data.interState ? (
                <td style={{ ...td, borderBottom: "none", borderTop: `1px solid ${TEXT}`, fontWeight: 600 }}>
                  {formatINR(data.totals.igst)}
                </td>
              ) : (
                <>
                  <td style={{ ...td, borderBottom: "none", borderTop: `1px solid ${TEXT}`, fontWeight: 600 }}>
                    {formatINR(data.totals.cgst)}
                  </td>
                  <td style={{ ...td, borderBottom: "none", borderTop: `1px solid ${TEXT}`, fontWeight: 600 }}>
                    {formatINR(data.totals.sgst)}
                  </td>
                </>
              )}
              <td style={{ ...td, borderBottom: "none", borderTop: `1px solid ${TEXT}`, fontWeight: 600 }}>
                {formatINR(data.totals.gross)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Grand total block ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <div style={{ minWidth: 280 }}>
            {data.discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  padding: "4px 0",
                }}
              >
                <span style={{ color: FAINT }}>
                  Discount applied (already netted off the lines above)
                </span>
                <span>− {formatINR(data.discount)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderTop: `2px solid ${TEXT}`,
                marginTop: 6,
                paddingTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Grand total
              </span>
              <span style={{ fontFamily: SERIF, fontSize: 20, color: GOLD }}>
                {formatINR(data.grandTotal)}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: FAINT, textAlign: "right", marginTop: 2 }}>
              Prices are inclusive of GST ({data.gstRate}%).
            </div>
          </div>
        </div>

        {/* ── Footer notes ── */}
        <div
          style={{
            marginTop: 32,
            borderTop: `1px solid ${RULE}`,
            paddingTop: 14,
            fontSize: 10.5,
            color: FAINT,
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0 }}>
            All prices are inclusive of GST at {data.gstRate}%{" "}
            {data.interState
              ? `(IGST ${data.gstRate}% — inter-state supply)`
              : `(CGST ${data.halfRate}% + SGST ${data.halfRate}%)`}
            , back-calculated from the gross amounts charged.
          </p>
          <p style={{ margin: "4px 0 0" }}>
            This is a computer-generated invoice and does not require a signature or stamp.
          </p>
          <p style={{ margin: "4px 0 0" }}>
            Questions? Write to {data.seller.email} or call {data.seller.phone}.
          </p>
        </div>
      </div>
    </>
  );
}
