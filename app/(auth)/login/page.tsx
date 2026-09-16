import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { getCurrentUser, safeNextPath } from "@/lib/auth";
import { DemoNotice } from "@/components/account/DemoNotice";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Fasteno account to view orders, addresses and your wishlist.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only allow same-origin redirect targets (guards against open redirect).
  const nextPath = safeNextPath(next);

  if (isDemoMode) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <DemoNotice
          title="Accounts are disabled in demo mode"
          description="Sign-in, order history and the admin panel need a connected Supabase project. Everything else — browsing, cart, wishlist and demo checkout — works without one."
          showWishlistLink
        />
      </section>
    );
  }

  const user = await getCurrentUser();
  if (user) redirect(nextPath);

  return (
    <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-3">Welcome back</p>
        <h1 className="font-display text-4xl text-ivory">Sign In</h1>
        <div className="gold-rule mx-auto mt-4" />
      </div>
      <div className="border border-line bg-card p-6 sm:p-8">
        <LoginForm next={nextPath} />
      </div>
    </section>
  );
}
