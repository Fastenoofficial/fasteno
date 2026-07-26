import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, MessageCircle } from "lucide-react";
import { isDemoMode, isShiprocketConfigured } from "@/lib/config";
import { mapOrderRow, requireAdmin, type OrderRow } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/account/OrderStatusBadge";
import {
  OrderStatusSelect,
  PaymentStatusSelect,
} from "@/components/admin/OrderStatusSelect";
import { RefundButton } from "@/components/admin/RefundButton";
import { ShippingTrackingCard } from "@/components/admin/ShippingTrackingCard";

export const metadata: Metadata = {
  title: "Order Detail",
};

interface OrderExtras {
  courier: string | null;
  awb_number: string | null;
  tracking_url: string | null;
  coupon_code: string | null;
  discount: number | null;
  shiprocket_status: string | null;
  shiprocket_synced_at: string | null;
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { id } = await params;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, email, phone, shipping_address, subtotal, shipping_fee, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, created_at, courier, awb_number, tracking_url, coupon_code, discount, shiprocket_status, shiprocket_synced_at, order_items(id, product_id, name, price, quantity, image)",
    )
    .eq("id", id)
    .single();
  if (!data) notFound();

  const order = mapOrderRow(data as OrderRow);
  const extras = data as unknown as OrderExtras;
  const discount = extras.discount ?? 0;
  const a = order.shippingAddress;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft size={14} />
        All orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Placed {formatDate(order.createdAt)} ·{" "}
            {order.userId ? "Registered customer" : "Guest order"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
          <a
            href={`/order/${order.id}/invoice`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 border border-gold-light px-3 py-1.5 text-xs font-medium uppercase tracking-[0.05em] text-ivory transition-colors hover:bg-surface"
          >
            <FileText size={13} />
            GST Invoice
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* items + totals */}
        <div className="border border-line bg-card">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-display text-lg text-ivory">Items</h3>
          </div>
          <ul className="divide-y divide-line px-5">
            {order.items.map((item, i) => (
              <li key={i} className="flex items-center gap-4 py-4">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-16 w-13 shrink-0 border border-line bg-surface object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ivory">{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatINR(item.price)} × {item.quantity}
                  </p>
                </div>
                <span className="font-display text-ivory">
                  {formatINR(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span>
                  Discount
                  {extras.coupon_code ? ` (${extras.coupon_code})` : ""}
                </span>
                <span>−{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span>
                {order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between pt-1.5 font-display text-lg text-ivory">
              <span>Total</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>
        </div>

        {/* sidebar: status controls, customer, address, payment */}
        <div className="space-y-6">
          <div className="space-y-4 border border-line bg-card p-5">
            <h3 className="font-display text-lg text-ivory">Fulfilment</h3>
            <OrderStatusSelect orderId={order.id} status={order.status} />
            <PaymentStatusSelect
              orderId={order.id}
              status={order.paymentStatus}
            />
          </div>

          <ShippingTrackingCard
            orderId={order.id}
            status={order.status}
            courier={extras.courier}
            awbNumber={extras.awb_number}
            trackingUrl={extras.tracking_url}
            shiprocketEnabled={isShiprocketConfigured}
            shiprocketStatus={extras.shiprocket_status}
            shiprocketSyncedAt={extras.shiprocket_synced_at}
          />

          <div className="border border-line bg-card p-5">
            <h3 className="font-display text-lg text-ivory">Customer</h3>
            <p className="mt-3 break-words text-sm text-muted">
              {order.email}
              <br />
              {order.phone}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <a
                href={`mailto:${order.email}?subject=${encodeURIComponent(`Your order ${order.orderNumber} — Fasteno Shyama`)}`}
                className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs uppercase tracking-[0.05em] text-muted transition-colors hover:border-gold-light hover:text-ivory"
              >
                <Mail size={12} />
                Email
              </a>
              {order.phone && (
                <a
                  href={`https://wa.me/91${order.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hello! Regarding your Fasteno Shyama order ${order.orderNumber}: `)}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 border border-line px-3 py-1.5 text-xs uppercase tracking-[0.05em] text-muted transition-colors hover:border-gold-light hover:text-ivory"
                >
                  <MessageCircle size={12} />
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="border border-line bg-card p-5">
            <h3 className="font-display text-lg text-ivory">
              Shipping address
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <span className="text-ivory">{a.name}</span>
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.city}, {a.state} — {a.pincode}
              <br />
              {a.phone}
            </p>
          </div>

          <div className="border border-line bg-card p-5">
            <h3 className="font-display text-lg text-ivory">Payment</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Method:{" "}
              <span className="uppercase text-ivory">
                {order.paymentMethod}
              </span>
              {order.razorpayOrderId && (
                <>
                  <br />
                  <span className="break-all">
                    Razorpay order: {order.razorpayOrderId}
                  </span>
                </>
              )}
              {order.razorpayPaymentId && (
                <>
                  <br />
                  <span className="break-all">
                    Payment id: {order.razorpayPaymentId}
                  </span>
                </>
              )}
            </p>
            {order.paymentStatus === "paid" && (
              <div className="mt-4 border-t border-line pt-4">
                <RefundButton orderId={order.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
