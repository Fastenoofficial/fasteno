"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/checkout/InvoiceView";
import { InvoiceActions } from "@/components/checkout/InvoiceActions";
import { findLocalOrder } from "@/components/checkout/local-orders";
import { buildInvoiceData } from "@/lib/invoice";
import type { Order } from "@/lib/types";

/** Client fallback for /order/[id]/invoice — reads the fs-orders
 *  localStorage cache (demo mode's only store; live mode's guest-order
 *  courtesy cache) and renders the invoice entirely in the browser. */
export function InvoiceLocalView({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setOrder(findLocalOrder(id));
    setChecked(true);
  }, [id]);

  if (!checked) {
    return (
      <div className="py-24 text-center text-sm text-muted">
        Preparing your invoice…
      </div>
    );
  }

  if (!order) notFound();

  return (
    <>
      <InvoiceActions orderId={order.id} />
      <InvoiceView data={buildInvoiceData(order)} />
    </>
  );
}
