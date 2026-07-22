"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { findLocalOrder } from "@/components/checkout/local-orders";

/** "View invoice" link for the order confirmation page → /order/[id]/invoice.
 *  With `requireLocal` it only renders once the order is found in the
 *  fs-orders localStorage cache (demo mode / guest orders), so it never
 *  points at an invoice that would 404. */
export function InvoiceLink({
  orderId,
  requireLocal = false,
}: {
  orderId: string;
  requireLocal?: boolean;
}) {
  const [visible, setVisible] = useState(!requireLocal);

  useEffect(() => {
    if (requireLocal) setVisible(Boolean(findLocalOrder(orderId)));
  }, [orderId, requireLocal]);

  if (!visible) return null;

  return (
    <div className="mt-8">
      <Link
        href={`/order/${orderId}/invoice`}
        className="inline-flex items-center gap-2 border border-gold/60 px-6 py-3 text-sm font-medium tracking-wide text-gold transition-colors duration-200 hover:bg-gold hover:text-ink"
      >
        <FileText size={16} strokeWidth={1.5} />
        View / Download Invoice
      </Link>
      <p className="mt-2 text-xs text-muted">
        Opens a printable GST invoice — use your browser&apos;s print dialog to
        save it as a PDF.
      </p>
    </div>
  );
}
