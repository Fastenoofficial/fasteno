"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";

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

  // Close the mobile drawer whenever the route changes (the Navbar instance
  // persists in the root layout across client-side navigation).
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="glass-surface sticky top-0 z-50 border-x-0 border-t-0">
      <nav className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* mobile menu toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 text-block-text transition-colors hover:border-white/20 hover:bg-white/10 xl:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>

        {/* brand */}
        <Link href="/" className="flex items-center rounded-md">
          <img
            src="/branding/fasteno-logo.png"
            alt="Fasteno - Exclusive Accessories"
            className="h-10 w-auto brightness-0 invert sm:h-12"
          />
        </Link>

        {/* desktop links */}
        <ul className="hidden items-center gap-5 xl:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`rounded-full px-1 py-2 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors hover:text-gold-light ${
                  pathname === l.href ? "text-gold-light" : "text-block-text/78"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Link
            href="/search"
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-block-text/85 transition-colors hover:bg-white/10 hover:text-gold-light"
          >
            <Search size={18} aria-hidden />
          </Link>
          <Link
            href="/account/wishlist"
            aria-label="Wishlist"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-block-text/85 transition-colors hover:bg-white/10 hover:text-gold-light sm:inline-flex"
          >
            <Heart size={18} aria-hidden />
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-block-text/85 transition-colors hover:bg-white/10 hover:text-gold-light"
          >
            <User size={18} aria-hidden />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-block-text/85 transition-colors hover:bg-white/10 hover:text-gold-light"
          >
            <ShoppingBag size={18} aria-hidden />
            {hydrated && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-light px-1 text-[10px] font-bold text-action">
                {count}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* mobile drawer */}
      {open && (
        <div
          id="mobile-nav-drawer"
          className="border-t border-white/10 bg-block/98 shadow-2xl xl:hidden"
        >
          <ul className="mx-auto max-w-[90rem] px-4 py-4 sm:px-6 lg:px-8">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl border-b border-white/8 px-3 py-3 text-sm uppercase tracking-[0.14em] text-block-text/80 transition-colors hover:bg-white/8 hover:text-gold-light"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/account/wishlist"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-3 text-sm uppercase tracking-[0.14em] text-block-text/80 transition-colors hover:bg-white/8 hover:text-gold-light"
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
