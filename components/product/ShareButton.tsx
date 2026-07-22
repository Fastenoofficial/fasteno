"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/** PDP share control. Uses the native share sheet when the browser has
 *  one (navigator.share); otherwise opens a small popover with WhatsApp
 *  and copy-link actions. Shares the current URL — no props beyond the
 *  product name needed. Styled to sit beside the wishlist button. */

export function ShareButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleClick() {
    const href = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, text: name, url: href });
      } catch {
        // sheet dismissed — nothing to do
      }
      return;
    }
    setUrl(href);
    setCopied(false);
    setOpen((o) => !o);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
    } catch {
      // clipboard unavailable — leave the WhatsApp option
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(`${name} — ${url}`)}`;

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Share ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleClick}
        className="inline-flex items-center gap-2 border border-line px-5 py-3.5 text-sm uppercase tracking-wide text-muted transition-colors hover:border-gold hover:text-gold cursor-pointer"
      >
        <Share2 size={16} />
        Share
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-48 border border-line bg-card p-1 shadow-[0_10px_30px_rgba(26,28,28,0.1)]"
        >
          <a
            role="menuitem"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs text-ivory transition-colors hover:bg-surface"
          >
            {/* WhatsApp glyph */}
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor"
              aria-hidden="true"
              className="shrink-0 text-gold"
            >
              <path d="M12 2a9.9 9.9 0 0 0-8.5 15.1L2 22l5-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.6-6.1c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.4-3c-.3-.4 0-.5.1-.7l.4-.5c.1-.2.2-.3.3-.5v-.5c0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.3 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.3-.3Z" />
            </svg>
            WhatsApp
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs text-ivory transition-colors hover:bg-surface cursor-pointer"
          >
            {copied ? (
              <Check size={14} className="shrink-0 text-success" />
            ) : (
              <Link2 size={14} className="shrink-0 text-gold" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
