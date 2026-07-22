import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isDemoMode } from "@/lib/config";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = {
  title: {
    default: "My Account",
    template: "%s | Fasteno Shyama",
  },
};

/** Account shell: heading + side nav. Rendered in demo mode too, because
 *  the wishlist page inside works without Supabase. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <p className="eyebrow mb-3">Your space</p>
        <h1 className="font-display text-4xl text-ivory">My Account</h1>
        <div className="gold-rule mt-4" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AccountNav showSignOut={!isDemoMode} />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
