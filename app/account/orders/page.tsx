import type { Metadata } from "next";
import { Package, Truck } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { mapOrderRow, requireUser, type OrderRow } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoNotice } from "@/components/account/DemoNotice";
import {
  OrderActions,
  type OrderRequestInfo,
} from "@/components/account/OrderActions";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";

export const metadata: Metadata = {
  title: "Order History",
  description: "Track your Fasteno Shyama orders.",
};

interface TrackingExtras {
  courier: string | null;
  awb_number: string | null;
  tracking_url: string | null;
}

export default async function OrdersPage() {
  if (isDemoMode) {
    return (
      <DemoNotice
        title="Order history is disabled in demo mode"
        description="Live order history needs a connected Supabase project. Orders placed with the demo checkout are kept in this browser — each confirmation page stays available from its order link."
      />
    );
  }

  const user = await requireUser("/account/orders");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, email, phone, shipping_address, subtotal, shipping_fee, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, status, created_at, courier, awb_number, tracking_url, order_items(id, product_id, name, price, quantity, image)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as (OrderRow & TrackingExtras)[];
  const orders = rows.map((row) => ({
    ...mapOrderRow(row),
    courier: row.courier,
    awbNumber: row.awb_number,
    trackingUrl: row.tracking_url,
  }));

  // Self-service requests for these orders (RLS: owner read). Ascending
  // order + overwrite keeps the latest request per order.
  const { data: requestRows } = await supabase
    .from("order_requests")
    .select("order_id, type, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const requestByOrder = new Map<string, OrderRequestInfo>();
  for (const r of requestRows ?? []) {
    requestByOrder.set(r.order_id as string, {
      type: r.type as OrderRequestInfo["type"],
      status: r.status as OrderRequestInfo["status"],
    });
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package size={32} strokeWidth={1.5} />}
        title="No orders yet"
        description="When you place your first order, it will appear here with live status updates."
        actionLabel="Browse the Collection"
        actionHref="/shop"
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border border-line bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-display text-lg text-ivory">
                {order.orderNumber}
              </span>
              <span className="text-xs text-muted">
                {formatDate(order.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="font-display text-lg text-ivory">
                {formatINR(order.total)}
              </span>
            </div>
          </div>
          <ul className="divide-y divide-line px-5">
            {order.items.map((item, i) => (
              <li key={`${order.id}-${i}`} className="flex items-center gap-4 py-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-14 w-11 shrink-0 border border-line bg-surface object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ivory">{item.name}</p>
                  <p className="text-xs text-muted">
                    Qty {item.quantity} · {formatINR(item.price)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {order.courier && order.awbNumber && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 text-ivory">
                <Truck size={13} className="text-gold" />
                {order.courier}
              </span>
              <span>AWB {order.awbNumber}</span>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  Track shipment →
                </a>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-muted">
            <span>
              Paid via{" "}
              <span className="uppercase text-ivory">
                {order.paymentMethod}
              </span>{" "}
              · {order.paymentStatus}
            </span>
            <span>
              Ships to {order.shippingAddress.city},{" "}
              {order.shippingAddress.state}
            </span>
          </div>
          {(requestByOrder.has(order.id) ||
            ["pending", "confirmed", "delivered"].includes(order.status)) && (
            <div className="border-t border-line px-5 py-4">
              <OrderActions
                orderId={order.id}
                status={order.status}
                request={requestByOrder.get(order.id) ?? null}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
