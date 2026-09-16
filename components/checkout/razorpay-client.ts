"use client";

/** Loads https://checkout.razorpay.com/v1/checkout.js on demand and opens
 *  the payment widget. Client-side only — uses the PUBLIC key id passed
 *  back by /api/checkout; the secret never leaves the server. */

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayWidgetConfig {
  keyId: string;
  orderId: string; // razorpay order id (order_…)
  amount: number; // paise
  currency: string;
  name: string;
  email: string;
  phone: string;
}

export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_JS;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load the Razorpay checkout script."));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Resolves with the gateway response on successful payment; resolves null
 *  when the customer closes the widget. A failed attempt does NOT settle
 *  the promise — Razorpay keeps the widget open for in-widget retries —
 *  but `onPaymentFailed` fires so the page can surface a warning. */
export async function openRazorpayCheckout(
  config: RazorpayWidgetConfig,
  handlers?: { onPaymentFailed?: (message: string) => void },
): Promise<RazorpaySuccessResponse | null> {
  await loadCheckoutScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout is unavailable.");
  }

  return new Promise((resolve) => {
    const widget = new window.Razorpay!({
      key: config.keyId,
      order_id: config.orderId,
      amount: config.amount,
      currency: config.currency,
      name: "Fasteno",
      description: "Fasteno order",
      prefill: {
        name: config.name,
        email: config.email,
        contact: config.phone,
      },
      theme: { color: "#1A1C1C" },
      modal: {
        ondismiss: () => resolve(null),
      },
      handler: (response: RazorpaySuccessResponse) => resolve(response),
    });
    widget.on("payment.failed", () =>
      handlers?.onPaymentFailed?.(
        "That payment attempt failed — you have not been charged. Try another method in the payment window, or close it to retry later.",
      ),
    );
    widget.open();
  });
}
