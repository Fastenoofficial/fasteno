"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_EMAIL_PATTERN,
  AUTH_NAME_MAX_LENGTH,
  AUTH_NAME_MIN_LENGTH,
  AUTH_NEW_PASSWORD_MAX_LENGTH,
  AUTH_NEW_PASSWORD_MIN_LENGTH,
  normalizeAuthEmail,
} from "@/lib/auth-input";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";

/** Email/password sign-up form (live mode only) with Google OAuth on top.
 *  The 001_schema.sql trigger creates the profile row using
 *  raw_user_meta_data.full_name (Google supplies it too). */
export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normalizedName = fullName.normalize("NFKC").trim();
    const normalizedEmail = normalizeAuthEmail(email);
    if (
      normalizedName.length < AUTH_NAME_MIN_LENGTH ||
      normalizedName.length > AUTH_NAME_MAX_LENGTH
    ) {
      setError(
        `Full name must be ${AUTH_NAME_MIN_LENGTH}–${AUTH_NAME_MAX_LENGTH} characters.`,
      );
      return;
    }
    if (
      normalizedEmail.length > AUTH_EMAIL_MAX_LENGTH ||
      !AUTH_EMAIL_PATTERN.test(normalizedEmail)
    ) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < AUTH_NEW_PASSWORD_MIN_LENGTH) {
      setError(
        `Password must be at least ${AUTH_NEW_PASSWORD_MIN_LENGTH} characters.`,
      );
      return;
    }
    if (password.length > AUTH_NEW_PASSWORD_MAX_LENGTH) {
      setError(
        `Password must be ${AUTH_NEW_PASSWORD_MAX_LENGTH} characters or fewer.`,
      );
      return;
    }
    setSubmitting(true);
    setFullName(normalizedName);
    setEmail(normalizedEmail);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: normalizedName } },
    });

    if (authError) {
      setError("Could not create your account right now. Please try again.");
      setSubmitting(false);
      return;
    }

    // With email confirmation enabled, no session is returned yet.
    if (!data.session) {
      setConfirmationSent(true);
      setSubmitting(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  if (confirmationSent) {
    return (
      <div className="border border-line bg-surface p-6 text-center">
        <h3 className="font-display text-xl text-ivory">Check your inbox</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          We&apos;ve sent a confirmation link to{" "}
          <span className="text-ivory">{email}</span>. Click it to activate
          your account, then sign in.
        </p>
        <div className="mt-5">
          <Button href="/login" variant="outline" size="sm">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <GoogleSignInButton next="/account" />
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Full name"
          type="text"
          name="fullName"
          autoComplete="name"
          required
          minLength={AUTH_NAME_MIN_LENGTH}
          maxLength={AUTH_NAME_MAX_LENGTH}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Arjun Mehta"
        />
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
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={AUTH_NEW_PASSWORD_MIN_LENGTH}
          maxLength={AUTH_NEW_PASSWORD_MAX_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${AUTH_NEW_PASSWORD_MIN_LENGTH} characters`}
          error={error ?? undefined}
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitting || !fullName || !email || !password}
        >
          {submitting ? "Creating account…" : "Create Account"}
        </Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-gold transition-colors hover:text-gold-light"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
