import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShoppingCart } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/account/OrderStatusBadge";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Orders",
};

interface AdminOrderRow {
  id: string;
  order_number: string;
  email: string;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
}

export default async function AdminOrdersPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, email, total, payment_method, payment_status, status, created_at",
    )
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as AdminOrderRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Orders</h2>
          <p className="mt-1 text-sm text-muted">{orders.length} total</p>
        </div>
        {/* plain <a> — a full navigation download, no Link prefetching */}
        <a
          href="/api/admin/export/orders"
          className="inline-flex items-center gap-2 border border-gold-light px-4 py-2 text-xs font-medium uppercase tracking-[0.05em] text-ivory transition-colors hover:bg-surface"
        >
          <Download size={14} />
          Export CSV
        </a>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={32} strokeWidth={1.5} />}
          title="No orders yet"
          description="Orders placed on the storefront will appear here."
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-surface"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-ivory transition-colors hover:text-gold"
                    >
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatDate(order.created_at)}
                    </p>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted">
                    {order.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs uppercase text-muted">
                        {order.payment_method}
                      </span>
                      <PaymentStatusBadge
                        status={order.payment_status as PaymentStatus}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status as OrderStatus} />
                  </td>
                  <td className="px-4 py-3 text-right font-display text-ivory">
                    {formatINR(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
