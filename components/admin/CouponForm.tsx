"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createCoupon, type CouponFormInput } from "@/components/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

/** New-coupon form. Percent value is entered as a whole percent; flat
 *  value, minimum subtotal and maximum discount are entered in rupees and
 *  converted to integer paise before hitting the server action. */

function rupeeStringToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

export function CouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [minSubtotalRupees, setMinSubtotalRupees] = useState("");
  const [maxDiscountRupees, setMaxDiscountRupees] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    let numericValue: number;
    if (type === "percent") {
      numericValue = Number.parseInt(value, 10);
      if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 90) {
        setError("Percent discount must be a whole number between 1 and 90.");
        return;
      }
    } else {
      const paise = rupeeStringToPaise(value);
      if (paise === null || paise <= 0) {
        setError("Please enter a valid flat discount in rupees.");
        return;
      }
      numericValue = paise;
    }

    const minSubtotal = minSubtotalRupees.trim()
      ? rupeeStringToPaise(minSubtotalRupees)
      : 0;
    if (minSubtotal === null) {
      setError("Please enter a valid minimum subtotal in rupees.");
      return;
    }

    let maxDiscount: number | null = null;
    if (type === "percent" && maxDiscountRupees.trim()) {
      maxDiscount = rupeeStringToPaise(maxDiscountRupees);
      if (maxDiscount === null || maxDiscount <= 0) {
        setError("Please enter a valid maximum discount in rupees.");
        return;
      }
    }

    let limit: number | null = null;
    if (usageLimit.trim()) {
      limit = Number.parseInt(usageLimit, 10);
      if (!Number.isInteger(limit) || limit < 1) {
        setError("Usage limit must be a whole number of 1 or more.");
        return;
      }
    }

    const input: CouponFormInput = {
      code: code.trim().toUpperCase(),
      type,
      value: numericValue,
      minSubtotal,
      maxDiscount,
      expiresAt: expiresAt || null,
      usageLimit: limit,
    };

    startTransition(async () => {
      const result = await createCoupon(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/coupons");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4 border border-line bg-card p-6">
        <h3 className="font-display text-lg text-ivory">Discount</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FESTIVE20"
            className="uppercase tracking-wider"
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "flat")}
            options={[
              { value: "percent", label: "Percent off (%)" },
              { value: "flat", label: "Flat amount off (₹)" },
            ]}
          />
          <Input
            label={type === "percent" ? "Value (%)" : "Value (₹)"}
            required
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "percent" ? "10" : "250"}
          />
        </div>
        <p className="text-xs text-muted">
          {type === "percent"
            ? "Percent of the order subtotal, e.g. 10 = 10% off."
            : "Entered in rupees — stored as paise, e.g. ₹250 off the subtotal."}
        </p>
      </div>

      <div className="space-y-4 border border-line bg-card p-6">
        <h3 className="font-display text-lg text-ivory">Conditions</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Minimum subtotal (₹, optional)"
            inputMode="decimal"
            value={minSubtotalRupees}
            onChange={(e) => setMinSubtotalRupees(e.target.value)}
            placeholder="999"
          />
          {type === "percent" && (
            <Input
              label="Maximum discount (₹, optional)"
              inputMode="decimal"
              value={maxDiscountRupees}
              onChange={(e) => setMaxDiscountRupees(e.target.value)}
              placeholder="500"
            />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Expiry date (optional)"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <Input
            label="Usage limit (optional)"
            inputMode="numeric"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            placeholder="100"
          />
        </div>
        <p className="text-xs text-muted">
          The coupon stays valid through the end of the expiry day (IST).
          Leave blank for no expiry / unlimited uses.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Creating…" : "Create Coupon"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => router.push("/admin/coupons")}
          disabled={pending}
        >
          Back to Coupons
        </Button>
      </div>
    </form>
  );
}
