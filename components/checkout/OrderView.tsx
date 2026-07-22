import { Badge } from "@/components/ui/Badge";
import { GST_RATE } from "@/lib/config";
import { formatDate, formatINR } from "@/lib/format";
import type { OrderExtras } from "@/lib/orders";
import type { Order, PaymentMethod, PaymentStatus } from "@/lib/types";

/** Order confirmation body — shared by the live (server) and demo/guest
 *  (client) paths of /order/[id]. No client-only or server-only imports
 *  (the lib/orders import is type-only — erased at compile time).
 *  Accepts plain Orders too: growth fields (discount, coupon, tracking)
 *  are optional so older cached orders keep rendering. */

type OrderLike = Order & Partial<OrderExtras>;

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  razorpay: "Paid online (Razorpay)",
  cod: "Cash on Delivery",
  demo: "Demo payment (simulated)",
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, "success" | "gold" | "danger" | "muted"> = {
  paid: "success",
  pending: "gold",
  failed: "danger",
  refunded: "muted",
};

export function OrderView({ order }: { order: OrderLike }) {
  const a = order.shippingAddress;
  const discount = Math.min(order.discount ?? 0, order.subtotal);
  const gst = order.total - Math.round(order.total / (1 + GST_RATE / 100));
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      {/* ── Items ── */}
      <div>
        <div className="border border-line">
          <div className="border-b border-line bg-surface px-5 py-3">
            <span className="eyebrow">Items in this order</span>
          </div>
          <ul>
            {order.items.map((item) => (
              <li
                key={item.productId + item.name}
                className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden border border-line bg-card">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ivory">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Qty {item.quantity} · {formatINR(item.price)} each
                  </p>
                </div>
                <span className="font-display text-ivory">
                  {formatINR(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Delivery address ── */}
        <div className="mt-6 border border-line">
          <div className="border-b border-line bg-surface px-5 py-3">
            <span className="eyebrow">Delivering to</span>
          </div>
          <div className="px-5 py-4 text-sm leading-relaxed text-muted">
            <p className="text-ivory">{a.name}</p>
            <p>
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
            </p>
            <p>
              {a.city}, {a.state} — {a.pincode}
            </p>
            <p className="mt-1">
              {a.phone} · {order.email}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary sidebar ── */}
      <aside className="h-fit border border-line bg-surface p-6">
        <h2 className="font-display text-xl text-ivory">Order summary</h2>
        <div className="gold-rule mt-3" />
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Order number</dt>
            <dd className="font-medium text-ivory">{order.orderNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Placed on</dt>
            <dd className="text-ivory">{formatDate(order.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Payment</dt>
            <dd className="text-right text-ivory">
              {PAYMENT_METHOD_LABEL[order.paymentMethod]}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Payment status</dt>
            <dd>
              <Badge tone={PAYMENT_STATUS_TONE[order.paymentStatus]}>
                {order.paymentStatus}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Order status</dt>
            <dd>
              <Badge tone={order.status === "cancelled" ? "danger" : "gold"}>
                {order.status}
              </Badge>
            </dd>
          </div>
        </dl>
        <div className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="text-ivory">{formatINR(order.subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">
                Discount
                {order.couponCode ? (
                  <span className="text-gold"> ({order.couponCode})</span>
                ) : null}
              </span>
              <span className="text-success">− {formatINR(discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Shipping</span>
            <span className={order.shippingFee === 0 ? "text-success" : "text-ivory"}>
              {order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}
            </span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <span className="text-ivory">Total</span>
            <span className="font-display text-lg text-gold">
              {formatINR(order.total)}
            </span>
          </div>
          <p className="text-xs text-muted">
            Inclusive of GST ({GST_RATE}%) · {formatINR(gst)}
          </p>
        </div>
      </aside>
    </div>
  );
}
