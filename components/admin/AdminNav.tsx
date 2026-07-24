"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Ticket,
  Users,
} from "lucide-react";

/** Pending-work counts shown as badges next to nav items. All optional —
 *  the layout supplies them server-side; zero/undefined renders nothing. */
export interface AdminNavCounts {
  orders?: number; // pending/confirmed (awaiting shipment)
  reviews?: number; // pending moderation
  requests?: number; // open return/replace requests
}

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, countKey: "orders" as const },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/reviews", label: "Reviews", icon: Star, countKey: "reviews" as const },
  { href: "/admin/requests", label: "Requests", icon: Inbox, countKey: "requests" as const },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Admin side navigation (horizontal scroll on mobile). */
export function AdminNav({ counts = {} }: { counts?: AdminNavCounts }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto border border-line bg-card p-2 lg:flex-col lg:overflow-visible"
    >
      {links.map(({ href, label, icon: Icon, countKey }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
        const count = countKey ? counts[countKey] ?? 0 : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active
                ? "bg-surface text-gold"
                : "text-muted hover:bg-surface hover:text-ivory"
            }`}
          >
            <Icon size={16} />
            {label}
            {count > 0 && (
              <span
                className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ink"
                aria-label={`${count} pending`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-3 px-4 py-3 text-sm text-muted transition-colors hover:bg-surface hover:text-ivory lg:mt-2 lg:border-t lg:border-line lg:pt-4"
      >
        <Store size={16} />
        View Store
      </Link>
    </nav>
  );
}
