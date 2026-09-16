import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  History,
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
import { LOW_STOCK_THRESHOLD } from "@/lib/admin-constants";
import {
  abbreviatedActor,
  describeAdminActivity,
  formatAdminActivityTime,
  isAdminActivityAction,
  type AdminActivityRow,
} from "@/lib/admin-activity";
import { formatDate, formatINR } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Dashboard",
};

/** Midnight today in IST (UTC+5:30), as epoch millis — orders are stored
 *  in UTC, so "today's orders" means created_at ≥ this instant. */
function startOfTodayIstMs(): number {
  const IST_OFFSET_MS = 330 * 60 * 1000;
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

interface RawActivityRow {
  id: number;
  occurred_at: string;
  actor_id: string;
  action: string;
  target_ids: string[] | null;
  metadata: Record<string, unknown> | null;
}

function mapActivity(row: RawActivityRow): AdminActivityRow | null {
  if (!isAdminActivityAction(row.action) || !Array.isArray(row.target_ids)) {
    return null;
  }
  return {
    id: row.id,
    occurred_at: row.occurred_at,
    actor_id: row.actor_id,
    action: row.action,
    target_ids: row.target_ids,
    metadata: row.metadata,
  };
}

export default async function AdminDashboardPage() {
  if (isDemoMode) return null;
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const [
    productCount,
    orderRows,
    lowStockCount,
    lowStockPreview,
    recentOrders,
    recentActivity,
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
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .lte("stock", LOW_STOCK_THRESHOLD),
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
      .from("admin_activity")
      .select("id, occurred_at, actor_id, action, target_ids, metadata")
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(6),
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
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + (order.total ?? 0), 0);

  const todayStartMs = startOfTodayIstMs();
  const todaysOrders = orders.filter(
    (order) =>
      order.created_at && new Date(order.created_at).getTime() >= todayStartMs,
  ).length;
  const pendingShipments = orders.filter(
    (order) => order.status === "pending" || order.status === "confirmed",
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
      value: lowStockCount.error ? "—" : String(lowStockCount.count ?? 0),
      note: lowStockCount.error
        ? "count temporarily unavailable"
        : `at ${LOW_STOCK_THRESHOLD} or fewer units`,
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

  const activities = ((recentActivity.data ?? []) as RawActivityRow[])
    .map(mapActivity)
    .filter((activity): activity is AdminActivityRow => activity !== null);

  return (
    <div className="space-y-8">
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

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-xl text-ivory">Low stock</h2>
            <Link
              href="/admin/products?stock=low"
              className="text-xs uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
            >
              View all
            </Link>
          </div>
          {lowStockPreview.error ? (
            <p className="px-5 py-6 text-sm text-danger">
              Low-stock products are temporarily unavailable.
            </p>
          ) : (lowStockPreview.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Stock levels look healthy"
                description={`No active products have ${LOW_STOCK_THRESHOLD} units or fewer.`}
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {(lowStockPreview.data ?? []).map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface"
                  >
                    <span className="truncate text-sm text-ivory">
                      {product.name}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        product.stock === 0 ? "text-danger" : "text-gold"
                      }`}
                    >
                      {product.stock === 0 ? "Sold out" : `${product.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-ivory">
              <History size={18} className="text-gold" />
              Recent activity
            </h2>
            <Link
              href="/admin/activity"
              className="text-xs uppercase tracking-widest text-gold transition-colors hover:text-gold-light"
            >
              View all
            </Link>
          </div>
          {recentActivity.error ? (
            <p className="px-5 py-6 text-sm text-danger">
              Activity is unavailable until migration 009 is applied.
            </p>
          ) : activities.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No admin activity yet"
                description="Safe product operations will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {activities.map((activity) => (
                <li key={activity.id} className="px-5 py-3">
                  <p className="text-sm text-ivory">
                    {describeAdminActivity(activity)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {abbreviatedActor(activity.actor_id)} ·{" "}
                    <time dateTime={activity.occurred_at}>
                      {formatAdminActivityTime(activity.occurred_at)}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
