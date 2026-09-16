"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_EMAIL_PATTERN,
  AUTH_LOGIN_PASSWORD_MAX_LENGTH,
  normalizeAuthEmail,
} from "@/lib/auth-input";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GoogleSignInButton } from "@/components/account/GoogleSignInButton";

/** Email/password login form (live mode only) with Google OAuth on top. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    if (!password || password.length > AUTH_LOGIN_PASSWORD_MAX_LENGTH) {
      setError("Incorrect email or password.");
      return;
    }
    setSubmitting(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : "Could not sign in right now. Please try again.",
      );
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div>
      <GoogleSignInButton next={next} />
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
        />
        <Input
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={AUTH_LOGIN_PASSWORD_MAX_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          error={error ?? undefined}
        />
        <p className="-mt-2 text-right text-xs">
          <Link
            href="/forgot-password"
            className="text-muted transition-colors hover:text-gold"
          >
            Forgot password?
          </Link>
        </p>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={submitting || !email || !password}
        >
          {submitting ? "Signing in…" : "Sign In"}
        </Button>
        <p className="text-center text-sm text-muted">
          New to Fasteno Shyama?{" "}
          <Link
            href="/register"
            className="text-gold transition-colors hover:text-gold-light"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
