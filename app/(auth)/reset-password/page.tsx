import type { Metadata } from "next";
import Link from "next/link";
import { isDemoMode } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { DemoNotice } from "@/components/account/DemoNotice";
import { Button } from "@/components/ui/Button";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Fasteno Shyama account.",
};

/** The recovery email links to /auth/callback?next=/reset-password, which
 *  exchanges the code for a session — so a valid recovery visit arrives
 *  here signed in. Without a session the link is missing/expired. */
export default async function ResetPasswordPage() {
  if (isDemoMode) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <DemoNotice
          title="Password reset is disabled in demo mode"
          description="Password recovery needs a connected Supabase project. Everything else — browsing, cart, wishlist and demo checkout — works without one."
        />
      </section>
    );
  }

  const user = await getCurrentUser();

  return (
    <section className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <div className="mb-10 text-center">
        <p className="eyebrow mb-3">Account recovery</p>
        <h1 className="font-display text-4xl text-ivory">Reset Password</h1>
        <div className="gold-rule mx-auto mt-4" />
      </div>
      <div className="border border-line bg-card p-6 sm:p-8">
        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="text-center">
            <h3 className="font-display text-xl text-ivory">
              Reset link expired
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This page only works right after following a password-reset
              link. Your link may have expired or already been used —
              request a fresh one.
            </p>
            <div className="mt-5">
              <Button href="/forgot-password" variant="primary" size="sm">
                Request New Link
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted">
              Or{" "}
              <Link
                href="/login"
                className="text-gold transition-colors hover:text-gold-light"
              >
                sign in
              </Link>{" "}
              if you remember your password.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
