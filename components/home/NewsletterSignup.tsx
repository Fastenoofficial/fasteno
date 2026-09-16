"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = "idle" | "sending" | "done";

/** Newsletter capture — POSTs to /api/newsletter. In demo mode the API
 *  stores nothing and we surface a small "(demo)" hint. */
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [isDemo, setIsDemo] = useState(false);
  const [already, setAlready] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        demo?: boolean;
        already?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setIsDemo(Boolean(data.demo));
      setAlready(Boolean(data.already));
      setStatus("done");
    } catch {
      setError("Could not reach the server. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section className="mx-auto max-w-[90rem] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="on-dark relative overflow-hidden rounded-3xl border border-white/10 bg-block px-6 py-12 text-center text-block-text shadow-2xl sm:px-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-gold-light/10 blur-3xl"
        />
        <div className="relative">
          <p className="eyebrow mb-3">The Finishing Note</p>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.035em] text-block-text md:text-4xl">
            First in line for new arrivals
          </h2>
          <div className="gold-rule mx-auto mt-4" />
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-block-text/65">
            Occasional letters on new collections, styling notes and members-only
            previews. No noise — we write when there is something worth wearing.
          </p>

          {status === "done" ? (
            <p
              role="status"
              className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-success/50 bg-white/5 px-5 py-3 text-sm text-block-text"
            >
              <CheckCircle2 size={16} className="text-gold-light" aria-hidden />
              {already
                ? "You're already on the list — nothing more to do."
                : "You're on the list — welcome to the inner circle."}
              {isDemo && (
                <span className="text-xs text-block-text/55">(demo — not stored)</span>
              )}
            </p>
          ) : (
            <>
              <form
                onSubmit={onSubmit}
                noValidate
                className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3 sm:flex-row"
              >
                <div className="flex-1 text-left">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className="min-h-12 w-full rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-block-text placeholder:text-block-text/45 transition-colors focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20"
                  />
                  {error && (
                    <p className="mt-1.5 px-3 text-xs text-red-300" role="alert">
                      {error}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="shrink-0 border-gold-light/40 sm:self-start"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "Subscribing…" : "Subscribe"}
                </Button>
              </form>
              <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-block-text/50">
                By subscribing you agree to receive emails from us; unsubscribe
                anytime. See our{" "}
                <Link
                  href="/privacy"
                  className="text-gold-light/90 underline-offset-2 transition-colors hover:text-gold-light hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
