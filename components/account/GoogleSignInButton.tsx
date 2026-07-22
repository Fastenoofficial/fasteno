"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/config";

/** "Continue with Google" + an "or" divider, rendered above the email
 *  forms on /login and /register. Uses Supabase OAuth (PKCE) — the code
 *  comes back through /auth/callback which exchanges it for a session.
 *  Requires the Google provider to be enabled in the Supabase dashboard;
 *  until then the click shows a friendly not-configured message. */
export function GoogleSignInButton({ next = "/account" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  async function handleClick() {
    setError(null);
    setRedirecting(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError("Google sign-in is not configured yet.");
      setRedirecting(false);
    }
    // on success the browser is redirected to Google — nothing to do here
  }

  return (
    <div className="mb-5 space-y-5">
      <button
        type="button"
        onClick={handleClick}
        disabled={redirecting}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-3 border border-gold-light px-6 py-3 text-sm font-medium uppercase tracking-[0.05em] text-ivory transition-colors duration-200 hover:bg-surface disabled:pointer-events-none disabled:opacity-45"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        {redirecting ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="text-center text-xs text-danger">{error}</p>}
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs uppercase tracking-widest text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
