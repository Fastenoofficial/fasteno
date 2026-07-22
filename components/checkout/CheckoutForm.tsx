"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  TicketPercent,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { saveLocalOrder } from "@/components/checkout/local-orders";
import {
  openRazorpayCheckout,
  type RazorpaySuccessResponse,
  type RazorpayWidgetConfig,
} from "@/components/checkout/razorpay-client";
import { useCart } from "@/lib/cart-context";
import {
  COD_MAX_TOTAL,
  FREE_SHIPPING_THRESHOLD,
  GST_RATE,
  SHIPPING_FEE,
  isDemoMode,
  isRazorpayConfigured,
} from "@/lib/config";
import { formatINR } from "@/lib/format";
import type { CouponType } from "@/lib/orders";
import type { Order, PaymentMethod } from "@/lib/types";

/** Checkout form + payment method selection. Posts to /api/checkout with
 *  productId/quantity lines (+ optional coupon code) only — the server
 *  re-prices from the catalog and re-validates the coupon. */

/** Coupon accepted by /api/coupon — shared between form and summary. */
export interface AppliedCoupon {
  code: string;
  discount: number; // paise — always 0 for free_shipping
  /** `free_shipping` waives the shipping fee instead of discounting. */
  type?: CouponType;
}

function parseCouponType(value: unknown): CouponType | undefined {
  return value === "percent" || value === "flat" || value === "free_shipping"
    ? value
    : undefined;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman & Nicobar Islands", "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Jammu & Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9]\d{5}$/;

interface FormState {
  email: string;
  phone: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_FORM: FormState = {
  email: "",
  phone: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!EMAIL_RE.test(form.email.trim()))
    errors.email = "Enter a valid email address.";
  if (!PHONE_RE.test(form.phone.replace(/\D/g, "")))
    errors.phone = "Enter a valid 10-digit mobile number.";
  if (!form.name.trim()) errors.name = "Recipient name is required.";
  if (!form.line1.trim()) errors.line1 = "Address is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.state) errors.state = "Select a state.";
  if (!PINCODE_RE.test(form.pincode.trim()))
    errors.pincode = "Enter a valid 6-digit PIN code.";
  return errors;
}

const methodCard = (active: boolean, disabled = false) =>
  `flex w-full items-start gap-4 border p-4 text-left transition-colors ${
    disabled
      ? "cursor-not-allowed border-line bg-surface opacity-50"
      : `cursor-pointer ${
          active ? "border-gold/70 bg-card" : "border-line bg-surface hover:border-gold/40"
        }`
  }`;

export function CheckoutForm({ coupon }: { coupon: AppliedCoupon | null }) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const defaultMethod: PaymentMethod = isDemoMode
    ? "demo"
    : isRazorpayConfigured
      ? "razorpay"
      : "cod";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pending Razorpay payment — kept so a dismissed widget can be reopened
  // for the SAME razorpay order id instead of silently giving up.
  const [pendingPayment, setPendingPayment] = useState<{
    order: Order;
    razorpay: RazorpayWidgetConfig;
  } | null>(null);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // ── COD guardrail (client mirror of the server check) ───────────────
  const shippingFee =
    coupon?.type === "free_shipping"
      ? 0
      : subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_FEE;
  const discount = Math.min(coupon?.discount ?? 0, subtotal);
  const total = subtotal + shippingFee - discount;
  const codAllowed = total <= COD_MAX_TOTAL;
  const codMessage = `Cash on Delivery is available for orders up to ${formatINR(COD_MAX_TOTAL)}. Please pay online for larger orders.`;

  useEffect(() => {
    // If COD becomes unavailable while selected, fall back to online payment.
    if (method === "cod" && !codAllowed && isRazorpayConfigured) {
      setMethod("razorpay");
    }
  }, [method, codAllowed]);

  const paymentOptions = useMemo(() => {
    if (isDemoMode) {
      return [
        {
          value: "demo" as const,
          title: "Demo payment",
          detail: "Simulated payment — no money moves. Orders are kept in this browser only.",
          icon: <FlaskConical size={18} />,
          disabled: false,
        },
      ];
    }
    const options = [];
    if (isRazorpayConfigured) {
      options.push({
        value: "razorpay" as const,
        title: "Pay online — UPI, cards, netbanking, wallets",
        detail: "Secure payment via Razorpay.",
        icon: <CreditCard size={18} />,
        disabled: false,
      });
    }
    options.push({
      value: "cod" as const,
      title: "Cash on Delivery",
      detail: codAllowed ? "Pay in cash when your order arrives." : codMessage,
      icon: <Banknote size={18} />,
      disabled: !codAllowed,
    });
    return options;
  }, [codAllowed, codMessage]);

  function finishOrder(order: Order) {
    saveLocalOrder(order); // demo store / live guest courtesy cache
    clearCart();
    router.push(`/order/${order.id}`);
  }

  /** Open the Razorpay widget for an already-created order and verify the
   *  payment. Reused by the first attempt and every retry. */
  async function attemptPayment(pending: {
    order: Order;
    razorpay: RazorpayWidgetConfig;
  }) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      let response: RazorpaySuccessResponse | null;
      try {
        response = await openRazorpayCheckout(pending.razorpay, {
          onPaymentFailed: (message) => setSubmitError(message),
        });
      } catch (err) {
        // Script failed to load etc. — the pending order survives so the
        // customer can retry.
        setSubmitError(
          err instanceof Error ? err.message : "Could not open the payment window.",
        );
        return;
      }
      if (!response) {
        // Widget dismissed — order stays pending; show the retry panel.
        return;
      }

      const verifyRes = await fetch("/api/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.verified) {
        throw new Error(
          "We could not verify the payment. If money was deducted it will be refunded — please contact support.",
        );
      }

      setPendingPayment(null);
      finishOrder({
        ...pending.order,
        paymentStatus: "paid",
        status: "confirmed",
        razorpayPaymentId: response.razorpay_payment_id,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (items.length === 0) {
      setSubmitError("Your cart is empty.");
      return;
    }
    if (method === "cod" && !codAllowed) {
      setSubmitError(codMessage);
      return;
    }

    setSubmitting(true);
    try {
      const phone = form.phone.replace(/\D/g, "");
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          contact: { email: form.email.trim(), phone },
          address: {
            name: form.name.trim(),
            phone,
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: form.city.trim(),
            state: form.state,
            pincode: form.pincode.trim(),
          },
          paymentMethod: method,
          couponCode: coupon?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      if (data.mode === "demo" || data.mode === "cod") {
        finishOrder(data.order as Order);
        return;
      }

      // Razorpay: remember the created order so the widget can be reopened
      // (same razorpay order id) if the customer dismisses it.
      const pending = {
        order: data.order as Order,
        razorpay: data.razorpay as RazorpayWidgetConfig,
      };
      setPendingPayment(pending);
      await attemptPayment(pending);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const awaitingRetry = pendingPayment !== null && !submitting;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* ── Contact ── */}
      <div className="border border-line bg-surface p-6">
        <h2 className="font-display text-xl text-ivory">Contact</h2>
        <div className="gold-rule mt-3" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
            required
          />
          <Input
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile"
            maxLength={10}
            value={form.phone}
            onChange={set("phone")}
            error={errors.phone}
            required
          />
        </div>
      </div>

      {/* ── Shipping address ── */}
      <div className="mt-6 border border-line bg-surface p-6">
        <h2 className="font-display text-xl text-ivory">Shipping address</h2>
        <div className="gold-rule mt-3" />
        <div className="mt-5 grid gap-4">
          <Input
            label="Full name"
            autoComplete="name"
            placeholder="Recipient's full name"
            value={form.name}
            onChange={set("name")}
            error={errors.name}
            required
          />
          <Input
            label="Address line 1"
            autoComplete="address-line1"
            placeholder="Flat / house no., building, street"
            value={form.line1}
            onChange={set("line1")}
            error={errors.line1}
            required
          />
          <Input
            label="Address line 2 (optional)"
            autoComplete="address-line2"
            placeholder="Area, landmark"
            value={form.line2}
            onChange={set("line2")}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              autoComplete="address-level2"
              placeholder="City"
              value={form.city}
              onChange={set("city")}
              error={errors.city}
              required
            />
            <div>
              <Select
                label="State"
                value={form.state}
                onChange={set("state")}
                options={[
                  { value: "", label: "Select state" },
                  ...INDIAN_STATES.map((s) => ({ value: s, label: s })),
                ]}
                required
              />
              {errors.state && (
                <span className="mt-1 block text-xs text-danger">
                  {errors.state}
                </span>
              )}
            </div>
            <Input
              label="PIN code"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="6-digit PIN"
              maxLength={6}
              value={form.pincode}
              onChange={set("pincode")}
              error={errors.pincode}
              required
            />
          </div>
        </div>
      </div>

      {/* ── Payment method ── */}
      <div className="mt-6 border border-line bg-surface p-6">
        <h2 className="font-display text-xl text-ivory">Payment</h2>
        <div className="gold-rule mt-3" />
        <div className="mt-5 space-y-3">
          {paymentOptions.map((opt) => (
            <label
              key={opt.value}
              className={methodCard(method === opt.value, opt.disabled)}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                checked={method === opt.value}
                disabled={opt.disabled}
                onChange={() => setMethod(opt.value)}
                className="sr-only"
              />
              <span
                className={`mt-0.5 ${
                  method === opt.value && !opt.disabled ? "text-gold" : "text-muted"
                }`}
              >
                {opt.icon}
              </span>
              <span>
                <span className="block text-sm text-ivory">{opt.title}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    opt.disabled ? "text-danger" : "text-muted"
                  }`}
                >
                  {opt.detail}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} className="text-gold" />
          Your details are used only to fulfil this order.
        </p>
      </div>

      {submitError && (
        <p
          role="alert"
          className="mt-6 border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {submitError}
        </p>
      )}

      {/* ── Payment not completed → explicit retry for the same order ── */}
      {awaitingRetry ? (
        <div className="mt-6 border border-gold/50 bg-surface p-5">
          <p className="text-sm font-medium text-gold">Payment not completed</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Your order {pendingPayment.order.orderNumber} is saved and waiting
            for payment — nothing has been charged yet. Reopen the secure
            payment window to finish paying.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => attemptPayment(pendingPayment)}
            >
              <RotateCcw size={16} />
              Retry payment
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting
              ? "Placing your order…"
              : method === "razorpay"
                ? "Continue to Payment"
                : "Place Order"}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Compact order summary used in the checkout sidebar — includes the
 *  coupon input and the GST-inclusive note. */
export function CheckoutSummary({
  coupon,
  onCouponChange,
}: {
  coupon: AppliedCoupon | null;
  onCouponChange: (coupon: AppliedCoupon | null) => void;
}) {
  const { hydrated, items, count, subtotal } = useCart();
  const shippingFee =
    coupon?.type === "free_shipping"
      ? 0
      : subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_FEE;

  // Re-validate the applied coupon when the cart subtotal changes (percent
  // discounts scale; minimum-order rules may stop being met).
  const appliedCode = coupon?.code ?? null;
  const lastCheckedSubtotal = useRef(subtotal);
  useEffect(() => {
    if (!appliedCode || !hydrated) return;
    if (lastCheckedSubtotal.current === subtotal) return;
    lastCheckedSubtotal.current = subtotal;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: appliedCode, subtotal }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data?.valid) {
          onCouponChange({
            code: data.code ?? appliedCode,
            discount: Number(data.discount ?? 0),
            type: parseCouponType(data.type),
          });
        } else {
          onCouponChange(null);
        }
      } catch {
        // network hiccup — keep the coupon; the server re-validates anyway
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedCode, subtotal, hydrated, onCouponChange]);

  return (
    <CheckoutSummaryView
      hydrated={hydrated}
      items={items}
      count={count}
      subtotal={subtotal}
      shippingFee={shippingFee}
      coupon={coupon}
      onCouponChange={onCouponChange}
    />
  );
}

function CheckoutSummaryView({
  hydrated,
  items,
  count,
  subtotal,
  shippingFee,
  coupon,
  onCouponChange,
}: {
  hydrated: boolean;
  items: ReturnType<typeof useCart>["items"];
  count: number;
  subtotal: number;
  shippingFee: number;
  coupon: AppliedCoupon | null;
  onCouponChange: (coupon: AppliedCoupon | null) => void;
}) {
  if (!hydrated) {
    return (
      <aside className="h-fit border border-line bg-surface p-6 text-sm text-muted">
        Loading your order…
      </aside>
    );
  }
  const discount = Math.min(coupon?.discount ?? 0, subtotal);
  const total = subtotal + shippingFee - discount;
  const gst = total - Math.round(total / (1 + GST_RATE / 100));
  const freeShippingCoupon = coupon?.type === "free_shipping";
  return (
    <aside className="h-fit border border-line bg-surface p-6">
      <h2 className="font-display text-xl text-ivory">
        Your order{" "}
        <span className="text-sm text-muted">
          ({count} {count === 1 ? "item" : "items"})
        </span>
      </h2>
      <div className="gold-rule mt-3" />
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-line bg-card">
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ivory">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted">Qty {item.quantity}</p>
            </div>
            <span className="text-sm text-ivory">
              {formatINR(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <CouponField
        subtotal={subtotal}
        coupon={coupon}
        onCouponChange={onCouponChange}
      />

      <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-ivory">{formatINR(subtotal)}</dd>
        </div>
        {discount > 0 && coupon && (
          <div className="flex justify-between">
            <dt className="text-muted">
              Discount <span className="text-gold">({coupon.code})</span>
            </dt>
            <dd className="text-success">− {formatINR(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd className={shippingFee === 0 ? "text-success" : "text-ivory"}>
            {freeShippingCoupon && coupon
              ? `Free shipping — ${coupon.code}`
              : shippingFee === 0
                ? "Free"
                : formatINR(shippingFee)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base">
          <dt className="text-ivory">Total</dt>
          <dd className="font-display text-lg text-gold">{formatINR(total)}</dd>
        </div>
        <p className="text-xs text-muted">
          Inclusive of GST ({GST_RATE}%) · {formatINR(gst)}
        </p>
      </dl>
    </aside>
  );
}

/** Coupon apply/remove control. Validation goes through POST /api/coupon;
 *  the discount shown is advisory — /api/checkout re-validates before
 *  charging. */
function CouponField({
  subtotal,
  coupon,
  onCouponChange,
}: {
  subtotal: number;
  coupon: AppliedCoupon | null;
  onCouponChange: (coupon: AppliedCoupon | null) => void;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, subtotal }),
      });
      const data = await res.json();
      if (res.ok && data?.valid) {
        onCouponChange({
          code: String(data.code ?? trimmed).toUpperCase(),
          discount: Number(data.discount ?? 0),
          type: parseCouponType(data.type),
        });
        setCode("");
      } else {
        setError(data?.reason ?? "That code is not valid.");
      }
    } catch {
      setError("Could not check the code. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  if (coupon) {
    return (
      <div className="mt-5 flex items-center justify-between border border-gold/40 bg-card px-3 py-2.5">
        <span className="flex items-center gap-2 text-xs text-ivory">
          <TicketPercent size={14} className="text-gold" />
          <span className="font-medium tracking-wide text-gold">{coupon.code}</span>
          applied
        </span>
        <button
          type="button"
          aria-label={`Remove coupon ${coupon.code}`}
          onClick={() => onCouponChange(null)}
          className="cursor-pointer text-muted transition-colors hover:text-danger"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder="Coupon code"
          aria-label="Coupon code"
          maxLength={40}
          className="w-full border border-line bg-card px-3 py-2 text-xs uppercase tracking-widest text-ivory placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:border-gold/70 focus:outline-none"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void apply()}
          disabled={checking || !code.trim()}
        >
          {checking ? "…" : "Apply"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
