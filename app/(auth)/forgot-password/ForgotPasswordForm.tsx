"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/config";
import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_EMAIL_PATTERN,
  normalizeAuthEmail,
} from "@/lib/auth-input";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Sends a Supabase password-recovery email. The link lands on
 *  /auth/callback (code → session exchange) and forwards to
 *  /reset-password where the new password is set. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = normalizeAuthEmail(email);
    if (
      normalizedEmail.length > AUTH_EMAIL_MAX_LENGTH ||
      !AUTH_EMAIL_PATTERN.test(normalizedEmail)
    ) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setEmail(normalizedEmail);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: `${SITE_URL}/auth/callback?next=/reset-password` },
    );

    if (resetError) {
      setError("Could not send a reset link right now. Please try again later.");
      setSubmitting(false);
      return;
    }
    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="border border-line bg-surface p-6 text-center">
        <h3 className="font-display text-xl text-ivory">Check your inbox</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          If an account exists for{" "}
          <span className="text-ivory">{email}</span>, we&apos;ve sent a
          password-reset link. Follow it to choose a new password.
        </p>
        <div className="mt-5">
          <Button href="/login" variant="outline" size="sm">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        maxLength={AUTH_EMAIL_MAX_LENGTH}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        error={error ?? undefined}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={submitting || !email}
      >
        {submitting ? "Sending link…" : "Send Reset Link"}
      </Button>
    </form>
  );
}
