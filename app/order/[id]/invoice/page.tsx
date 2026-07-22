import type { Metadata } from "next";
import { InvoiceView } from "@/components/checkout/InvoiceView";
import { InvoiceActions } from "@/components/checkout/InvoiceActions";
import { InvoiceLocalView } from "@/components/checkout/InvoiceLocalView";
import { isDemoMode } from "@/lib/config";
import { buildInvoiceData } from "@/lib/invoice";
import { getSupabaseOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Invoice",
  description: "Printable GST invoice for your Fasteno Shyama order.",
  robots: { index: false, follow: false },
};

/** /order/[id]/invoice — printable tax invoice.
 *  Live mode: fetch from Supabase (RLS: owner/admin) and render on the
 *  server. Demo mode / guest orders hidden by RLS: fall back to the
 *  localStorage client island. Print → browser dialog → Save as PDF. */
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let content: React.ReactNode;

  if (isDemoMode) {
    content = <InvoiceLocalView id={id} />;
  } else {
    const order = await getSupabaseOrder(id);
    content = order ? (
      <>
        <InvoiceActions orderId={order.id} />
        <InvoiceView data={buildInvoiceData(order)} />
      </>
    ) : (
      <InvoiceLocalView id={id} />
    );
  }

  // White backdrop behind the paper sheet — this page intentionally breaks
  // the dark theme. Inline style keeps globals.css untouched.
  return (
    <section
      id="invoice-backdrop"
      style={{ backgroundColor: "#efece5", minHeight: "100%" }}
      className="px-4 py-10 sm:px-6"
    >
      {content}
    </section>
  );
}
