import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { DemoNotice } from "@/components/account/DemoNotice";
import { RegisterForm } from "@/components/account/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a Fasteno Shyama account for faster checkout, order tracking and a saved wishlist.",
};

export default async function RegisterPage() {
  if (isDemoMode) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <DemoNotice
          title="Accounts are disabled in demo mode"
          description="Registration needs a connected Supabase project. Everything else — browsing, cart, wishlist and demo checkout — works without one."
          showWishlistLink
        />
      </section>
    );
  }

  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-3">Join us</p>
        <h1 className="font-display text-4xl text-ivory">Create Account</h1>
        <div className="gold-rule mx-auto mt-4" />
        <p className="mt-4 text-sm text-muted">
          Faster checkout, order tracking and a saved wishlist.
        </p>
      </div>
      <div className="border border-line bg-card p-6 sm:p-8">
        <RegisterForm />
      </div>
    </section>
  );
}
