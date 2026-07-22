import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/account/OrderStatusBadge";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Customer",
};

interface CustomerOrderRow {
  id: string;
  order_number: string;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  created_at: string;
}

/** Email lives in auth.users — service-role admin API when available,
 *  else recovered from the customer's most recent order. */
async function getEmail(
  userId: string,
  orders: { email?: string | null }[],
): Promise<string> {
  const service = createServiceClient();
  if (service) {
    const { data } = await service.auth.admin.getUserById(userId);
    if (data?.user?.email) return data.user.email;
  }
  return orders.find((o) => o.email)?.email ?? "—";
}

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { id } = await params;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const [profileRes, ordersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("orders")
      .select(
        "id, order_number, email, total, payment_method, payment_status, status, created_at",
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const orders = (ordersRes.data ?? []) as (CustomerOrderRow & {
    email: string | null;
  })[];
  const email = await getEmail(id, orders);
  const lifetimeValue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  const facts = [
    { label: "Email", value: email },
    { label: "Phone", value: profile.phone?.trim() || "—" },
    { label: "Joined", value: formatDate(profile.created_at) },
    { label: "Orders", value: String(orders.length) },
    { label: "Lifetime value", value: formatINR(lifetimeValue) },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft size={14} />
        All customers
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl text-ivory">
          {profile.full_name?.trim() || "Unnamed customer"}
        </h2>
        {profile.role === "admin" && <Badge tone="gold">Admin</Badge>}
      </div>

      {/* profile facts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(({ label, value }) => (
          <div key={label} className="border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted">
              {label}
            </p>
            <p className="mt-2 truncate text-sm text-ivory" title={value}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* orders */}
      <div className="border border-line bg-card">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-xl text-ivory">Orders</h3>
        </div>
        {orders.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<ShoppingCart size={32} strokeWidth={1.5} />}
              title="No orders yet"
              description="This customer hasn't placed an order."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                  <th className="px-4 py-3 font-medium">Order</th>
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
    </div>
  );
}
