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

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Admin side navigation (horizontal scroll on mobile). */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto border border-line bg-card p-2 lg:flex-col lg:overflow-visible"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === href : pathname.startsWith(href);
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
