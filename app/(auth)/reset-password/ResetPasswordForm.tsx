"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_NEW_PASSWORD_MAX_LENGTH,
  AUTH_NEW_PASSWORD_MIN_LENGTH,
} from "@/lib/auth-input";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Sets a new password for the recovery session established by the
 *  /auth/callback code exchange. */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

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
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(
        /session|token|expired/i.test(updateError.message)
          ? "Your reset link has expired. Please request a new one."
          : "Could not update your password right now. Please try again.",
      );
      setSubmitting(false);
      return;
    }

    setDone(true);
    setSubmitting(false);
    router.refresh();
  }

  if (done) {
    return (
      <div className="border border-line bg-surface p-6 text-center">
        <h3 className="font-display text-xl text-ivory">Password updated</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your new password is set and you&apos;re signed in.
        </p>
        <div className="mt-5">
          <Button href="/account" variant="primary" size="sm">
            Go to My Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Input
        label="New password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={AUTH_NEW_PASSWORD_MIN_LENGTH}
        maxLength={AUTH_NEW_PASSWORD_MAX_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={`At least ${AUTH_NEW_PASSWORD_MIN_LENGTH} characters`}
      />
      <Input
        label="Confirm new password"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={AUTH_NEW_PASSWORD_MIN_LENGTH}
        maxLength={AUTH_NEW_PASSWORD_MAX_LENGTH}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repeat the new password"
        error={error ?? undefined}
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={submitting || !password || !confirm}
      >
        {submitting ? "Updating…" : "Set New Password"}
      </Button>
    </form>
  );
}
