"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** "Delivers to your pincode?" check on the product page.
 *
 *  Deliberately quiet about failure: if Shiprocket is unconfigured or the
 *  lookup fails, the widget hides itself rather than showing an error. A
 *  shopper must never be told "we can't check" — that reads as "we can't
 *  deliver" and loses the sale. The server still ships everywhere. */

interface CheckState {
  serviceable: boolean;
  etaDays: number | null;
  codAvailable: boolean;
}

export function DeliveryCheck() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<CheckState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  if (hidden) return null;

  async function check() {
    const clean = pincode.replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Please enter a valid 6-digit pincode.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/shipping/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: clean, cod: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        unavailable?: boolean;
        serviceable?: boolean;
        etaDays?: number | null;
        codAvailable?: boolean;
      };

      if (data.unavailable) {
        // Quote unavailable — remove the widget entirely.
        setHidden(true);
        return;
      }
      if (!res.ok || data.error) {
        setError(data.error ?? "Could not check right now.");
        return;
      }
      setResult({
        serviceable: Boolean(data.serviceable),
        etaDays: data.etaDays ?? null,
        codAvailable: Boolean(data.codAvailable),
      });
    } catch {
      setHidden(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-muted">
        Check delivery to your pincode
      </p>

      <div className="flex items-start gap-2">
        <Input
          label=""
          aria-label="Delivery pincode"
          value={pincode}
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit pincode"
          disabled={loading}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
            setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void check();
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void check()}
          disabled={loading || pincode.length !== 6}
        >
          {loading ? "Checking…" : "Check"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {result && (
        <div className="mt-2.5 text-xs leading-relaxed">
          {result.serviceable ? (
            <p className="text-success">
              Delivers to {pincode}
              {result.etaDays ? (
                <span className="text-muted">
                  {" "}
                  · about {result.etaDays} {result.etaDays === 1 ? "day" : "days"}
                </span>
              ) : null}
              {result.codAvailable ? (
                <span className="text-muted"> · Cash on Delivery available</span>
              ) : (
                <span className="text-muted"> · prepaid only</span>
              )}
            </p>
          ) : (
            <p className="text-muted">
              Our courier partners don&rsquo;t reach {pincode} yet. Write to us
              and we&rsquo;ll find a way to get it to you.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
