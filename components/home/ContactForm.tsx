"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { SUPPORT_EMAIL } from "@/lib/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Contact form — no backend in v1. Validates the fields, then hands the
 *  message off to the visitor's mail client via a prefilled mailto link. */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please tell us your name.";
    if (!EMAIL_RE.test(email.trim()))
      next.email = "Please enter a valid email address.";
    if (!message.trim()) next.message = "Please write a short message.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const mailSubject = subject.trim() || `Website enquiry from ${name.trim()}`;
    const body = `${message.trim()}\n\n— ${name.trim()} (${email.trim()})`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      mailSubject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  if (sent) {
    return (
      <div
        role="status"
        className="border border-success/50 bg-card px-6 py-8 text-center"
      >
        <p className="font-display text-xl text-success">
          Your mail app should now be open
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          If it didn&rsquo;t open, write to us directly at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-gold transition-colors hover:text-gold-light"
          >
            {SUPPORT_EMAIL}
          </a>
          . We reply within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Your name"
          placeholder="Arjun Mehta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
      </div>
      <Input
        label="Subject (optional)"
        placeholder="Order query, gifting help, bulk order…"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <Textarea
        label="Message"
        rows={6}
        placeholder="Tell us how we can help — order number if you have one."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={errors.message}
      />
      <Button type="submit">
        <Send size={15} aria-hidden />
        Send Message
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Submitting opens your email app with the message pre-filled — nothing
        is stored on this site.
      </p>
    </form>
  );
}
