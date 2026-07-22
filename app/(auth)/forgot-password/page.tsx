import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { DemoNotice } from "@/components/account/DemoNotice";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Fasteno Shyama account password.",
};

export default async function ForgotPasswordPage() {
  if (isDemoMode) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <DemoNotice
          title="Password reset is disabled in demo mode"
          description="Password recovery emails need a connected Supabase project. Everything else — browsing, cart, wishlist and demo checkout — works without one."
        />
      </section>
    );
  }

  const user = await getCurrentUser();
  if (user) redirect("/account");

  return (
    <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-3">Account recovery</p>
        <h1 className="font-display text-4xl text-ivory">Forgot Password</h1>
        <div className="gold-rule mx-auto mt-4" />
        <p className="mt-4 text-sm text-muted">
          Enter your email and we&apos;ll send you a link to choose a new
          password.
        </p>
      </div>
      <div className="border border-line bg-card p-6 sm:p-8">
        <ForgotPasswordForm />
        <p className="mt-5 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-gold transition-colors hover:text-gold-light"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
