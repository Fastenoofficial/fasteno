"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/** On-screen controls for the printable invoice page (hidden in print via
 *  the `.no-print` class defined by InvoiceView). Print → the browser's
 *  dialog, where "Save as PDF" is the v1 download path. */
export function InvoiceActions({ orderId }: { orderId: string }) {
  return (
    <div className="no-print mx-auto mb-6 flex max-w-[800px] flex-wrap items-center justify-between gap-3">
      <Link
        href={`/order/${orderId}`}
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back to order
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex cursor-pointer items-center gap-2 bg-block px-6 py-3 text-sm font-medium uppercase tracking-[0.05em] text-block-text transition-colors duration-200 hover:bg-block-soft"
      >
        <Printer size={16} strokeWidth={1.5} />
        Print / Save as PDF
      </button>
    </div>
  );
}
