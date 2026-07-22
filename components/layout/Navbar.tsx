"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { SITE_NAME } from "@/lib/config";

const navLinks = [
  { href: "/shop", label: "Shop All" },
  { href: "/shop/ties", label: "Ties" },
  { href: "/shop/cufflinks", label: "Cufflinks" },
  { href: "/shop/brooches", label: "Brooches" },
  { href: "/shop/pocket-squares", label: "Pocket Squares" },
  { href: "/shop/buttons", label: "Buttons" },
  { href: "/shop/gift-sets", label: "Gift Sets" },
];

export function Navbar() {
  const { count, hydrated } = useCart();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/95 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* mobile menu toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center text-ivory lg:hidden cursor-pointer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* brand */}
        <Link href="/" className="flex flex-col items-center leading-none">
          <span className="font-display text-lg tracking-[0.18em] text-ivory sm:text-xl">
            {SITE_NAME.toUpperCase()}
          </span>
          <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.4em] text-gold sm:block">
            Fine Accessories
          </span>
        </Link>

        {/* desktop links */}
        <ul className="hidden items-center gap-6 lg:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`text-xs uppercase tracking-[0.14em] transition-colors hover:text-gold ${
                  pathname === l.href ? "text-gold" : "text-ivory/85"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center text-ivory transition-colors hover:text-gold"
          >
            <Search size={18} />
          </Link>
          <Link
            href="/account/wishlist"
            aria-label="Wishlist"
            className="hidden h-10 w-10 items-center justify-center text-ivory transition-colors hover:text-gold sm:inline-flex"
          >
            <Heart size={18} />
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex h-10 w-10 items-center justify-center text-ivory transition-colors hover:text-gold"
          >
            <User size={18} />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative inline-flex h-10 w-10 items-center justify-center text-ivory transition-colors hover:text-gold"
          >
            <ShoppingBag size={18} />
            {hydrated && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center bg-block px-1 text-[10px] font-bold text-block-text">
                {count}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* mobile drawer */}
      {open && (
        <div className="border-t border-line bg-ink lg:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line/50 py-3 text-sm uppercase tracking-[0.14em] text-ivory/85 transition-colors hover:text-gold"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/account/wishlist"
                onClick={() => setOpen(false)}
                className="block py-3 text-sm uppercase tracking-[0.14em] text-ivory/85 transition-colors hover:text-gold"
              >
                Wishlist
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
