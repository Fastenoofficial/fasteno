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
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="border border-line bg-card px-6 py-12 text-center sm:px-12">
        <p className="eyebrow mb-3">The Finishing Note</p>
        <h2 className="font-display text-3xl text-ivory md:text-4xl">
          First in line for new arrivals
        </h2>
        <div className="gold-rule mx-auto mt-4" />
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          Occasional letters on new collections, styling notes and members-only
          previews. No noise — we write when there is something worth wearing.
        </p>

        {status === "done" ? (
          <p
            role="status"
            className="mx-auto mt-8 inline-flex items-center gap-2 border border-success/50 px-5 py-3 text-sm text-success"
          >
            <CheckCircle2 size={16} aria-hidden />
            {already
              ? "You're already on the list — nothing more to do."
              : "You're on the list — welcome to the inner circle."}
            {isDemo && (
              <span className="text-xs text-muted">(demo — not stored)</span>
            )}
          </p>
        ) : (
          <>
            <form
              onSubmit={onSubmit}
              noValidate
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
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
                  className="w-full border-0 border-b border-ivory bg-transparent px-0 py-3 text-sm text-ivory placeholder:text-muted/70 transition-colors focus:border-b-2 focus:border-ivory focus:outline-none"
                />
                {error && (
                  <p className="mt-1.5 text-xs text-danger" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="sm:self-start"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Subscribing…" : "Subscribe"}
              </Button>
            </form>
            <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-muted/80">
              By subscribing you agree to receive emails from us; unsubscribe
              anytime. See our{" "}
              <Link
                href="/privacy"
                className="text-gold/80 underline-offset-2 transition-colors hover:text-gold"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </section>
  );
}
