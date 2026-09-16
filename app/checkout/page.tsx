import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout — Razorpay (UPI, cards, netbanking, wallets) and Cash on Delivery across India.",
};

export default function CheckoutPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      {isDemoMode && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-gold-light/50 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
          <FlaskConical size={18} className="mt-0.5 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-medium text-gold">
              Demo mode — payments are simulated
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              No real payment will be taken and no data leaves your browser.
              Orders placed here are stored locally for demonstration only.
            </p>
          </div>
        </div>
      )}

      <p className="eyebrow">Almost there</p>
      <h1 className="mt-2 font-display text-4xl text-ivory">Checkout</h1>
      <div className="gold-rule mt-4" />

      <CheckoutClient />
    </section>
  );
}
