"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (authError) {
      setError(authError.message);
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
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
