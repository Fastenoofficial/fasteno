import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  IndianRupee,
  Mail,
  Package,
  ShoppingCart,
  Ticket,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
};

const LOW_STOCK_THRESHOLD = 5;

/** Midnight today in IST (UTC+5:30), as epoch millis — orders are stored
 *  in UTC, so "today's orders" means created_at ≥ this instant. */
function startOfTodayIstMs(): number {
  const IST_OFFSET_MS = 330 * 60 * 1000; // +5:30
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return (
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) -
    IST_OFFSET_MS
  );
}

interface RecentOrderRow {
  id: string;
  order_number: string;
  email: string;
  total: number;
  status: string;
  created_at: string;
}

export default async function AdminDashboardPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const [
    productCount,
    orderRows,
    lowStock,
    recentOrders,
    subscriberCount,
    couponCount,
    customerCount,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase.from("orders").select("total, status, created_at"),
    supabase
      .from("products")
      .select("id, name, stock")
      .eq("active", true)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock")
      .limit(6),
    supabase
      .from("orders")
      .select("id, order_number, email, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
  ]);

  const orders = orderRows.data ?? [];
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.total ?? 0), 0);

  const todayStartMs = startOfTodayIstMs();
  const todaysOrders = orders.filter(
    (o) => o.created_at && new Date(o.created_at).getTime() >= todayStartMs,
  ).length;
  const pendingShipments = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;

  const stats = [
    {
      label: "Revenue",
      value: formatINR(revenue),
      note: "excluding cancelled orders",
      icon: IndianRupee,
    },
    {
      label: "Orders",
      value: String(orders.length),
      note: "all time",
      icon: ShoppingCart,
    },
    {
      label: "Today's orders",
      value: String(todaysOrders),
      note: "placed since midnight IST",
      icon: CalendarClock,
    },
    {
      label: "Pending shipments",
      value: String(pendingShipments),
      note: "pending or confirmed orders",
      icon: Truck,
    },
    {
      label: "Customers",
      value: String(customerCount.count ?? 0),
      note: "registered accounts",
      icon: Users,
    },
    {
      label: "Live products",
      value: String(productCount.count ?? 0),
      note: "active in the catalog",
      icon: Package,
    },
    {
      label: "Low stock",
      value: String(lowStock.data?.length ?? 0),
      note: `at ${LOW_STOCK_THRESHOLD} or fewer units`,
      icon: TriangleAlert,
    },
    {
      label: "Subscribers",
      value: String(subscriberCount.count ?? 0),
      note: "newsletter sign-ups",
      icon: Mail,
    },
    {
      label: "Coupons",
      value: String(couponCount.count ?? 0),
      note: "active discount codes",
      icon: Ticket,
    },
  ];

  return (
    <div className="space-y-8">
      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="border border-line bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted">
                {label}
              </p>
              <Icon size={16} className="text-gold/70" />
            </div>
            <p className="mt-3 font-display text-3xl text-ivory">{value}</p>
            <p className="mt-1 text-xs text-muted">{note}</p>
          </div>
        ))}
      </div>

      {/* recent orders */}
      <div className="border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl text-ivory">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-xs uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
          >
            View all
          </Link>
        </div>
        {(recentOrders.data ?? []).length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No orders yet"
              description="Orders placed on the storefront will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {((recentOrders.data ?? []) as RecentOrderRow[]).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ivory">{order.order_number}</p>
                    <p className="truncate text-xs text-muted">
                      {order.email} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status as OrderStatus} />
                    <span className="font-display text-ivory">
                      {formatINR(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* low stock */}
      {(lowStock.data ?? []).length > 0 && (
        <div className="border border-line bg-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-xl text-ivory">Low stock</h2>
          </div>
          <ul className="divide-y divide-line">
            {(lowStock.data ?? []).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface"
                >
                  <span className="truncate text-sm text-ivory">{p.name}</span>
                  <span
                    className={`text-xs font-semibold ${
                      p.stock === 0 ? "text-danger" : "text-gold"
                    }`}
                  >
                    {p.stock === 0 ? "Sold out" : `${p.stock} left`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
