import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderView } from "@/components/checkout/OrderView";
import { InvoiceLink } from "@/components/checkout/InvoiceLink";
import {
  ConfirmationFooter,
  ConfirmationHeader,
  LocalOrderView,
} from "@/components/checkout/LocalOrderView";
import { isDemoMode } from "@/lib/config";
import { readGuestOrderCredential } from "@/lib/guest-order-access";
import { getSupabaseOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "Your Fasteno Shyama order details.",
  robots: { index: false },
};

/** /order/[id] — confirmation page.
 *  Live mode: fetch from Supabase (RLS: owner/admin). When the row is not
 *  visible (guest order, wrong id) fall back to the browser's local order
 *  cache, which also serves demo mode entirely. */
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let content: React.ReactNode;

  if (isDemoMode) {
    content = (
      <>
        <LocalOrderView id={id} />
        <InvoiceLink orderId={id} requireLocal />
      </>
    );
  } else {
    const guestToken = await readGuestOrderCredential(id);
    const order = await getSupabaseOrder(id, { guestToken });
    if (!order) notFound();
    content = (
      <>
        <ConfirmationHeader orderNumber={order.orderNumber} email={order.email} />
        <OrderView order={order} />
        <InvoiceLink orderId={order.id} />
        <ConfirmationFooter />
      </>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">{content}</section>
  );
}
