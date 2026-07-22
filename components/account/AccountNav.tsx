"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogOut, MapPin, Package, User } from "lucide-react";
import { signOut } from "@/components/account/actions";

const links = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
];

/** Side navigation for the account area (horizontal scroll on mobile). */
export function AccountNav({ showSignOut }: { showSignOut: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
      className="flex gap-1 overflow-x-auto border border-line bg-card p-2 lg:flex-col lg:overflow-visible"
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/account" ? pathname === href : pathname.startsWith(href);
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
      {showSignOut && (
        <form action={signOut} className="shrink-0 lg:mt-2 lg:border-t lg:border-line lg:pt-2">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-sm text-muted transition-colors hover:bg-surface hover:text-danger"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      )}
    </nav>
  );
}
