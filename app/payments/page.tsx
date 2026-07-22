import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Landmark,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import {
  COD_MAX_TOTAL,
  GST_RATE,
  SITE_NAME,
  SUPPORT_EMAIL,
} from "@/lib/config";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Payment Methods",
  description: `How to pay at ${SITE_NAME} — UPI, cards, netbanking and wallets via Razorpay, plus Cash on Delivery up to ${formatINR(COD_MAX_TOTAL)}. PCI-DSS secure, GST-inclusive pricing, clear refund timelines.`,
};

const methods = [
  {
    icon: Smartphone,
    title: "UPI",
    text: "Google Pay, PhonePe, Paytm, BHIM and every UPI app — scan or use your UPI ID at checkout.",
  },
  {
    icon: CreditCard,
    title: "Cards",
    text: "Visa, Mastercard, RuPay and American Express credit and debit cards, including EMI where your bank offers it.",
  },
  {
    icon: Landmark,
    title: "Netbanking",
    text: "All major Indian banks are supported through Razorpay's netbanking gateway.",
  },
  {
    icon: Wallet,
    title: "Wallets",
    text: "Popular wallets such as Paytm, Mobikwik and Freecharge.",
  },
  {
    icon: Banknote,
    title: "Cash on Delivery",
    text: `Pay in cash (or UPI at the doorstep, where the courier supports it) on orders up to ${formatINR(COD_MAX_TOTAL)}.`,
  },
];

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pay your way"
        title="Payment Methods"
        description="Every way to pay, how your payment is secured, when you are charged, and how refunds and cancellations work."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
        {/* methods grid */}
        <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map(({ icon: Icon, title, text }) => (
            <div key={title} className="border border-line bg-card p-5">
              <Icon size={20} className="text-gold" aria-hidden />
              <h2 className="mt-3 font-display text-base text-ivory">
                {title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-12 text-sm leading-relaxed text-muted">
          {/* security */}
          <div>
            <h2 className="flex items-center gap-3 font-display text-2xl text-ivory">
              <ShieldCheck size={22} className="text-gold" aria-hidden />
              Payment security
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                All online payments are processed by{" "}
                <span className="text-ivory">Razorpay</span>, a PCI-DSS
                Level&nbsp;1 certified payment gateway. Your card number, UPI
                PIN and banking credentials are entered directly into
                Razorpay&rsquo;s secure interface — {SITE_NAME} never sees or
                stores them.
              </li>
              <li>
                Every completed payment is verified on our servers using an
                HMAC signature check before the order is confirmed — a payment
                confirmation cannot be forged by the browser.
              </li>
              <li>
                The entire site runs over HTTPS; payment data is encrypted in
                transit end to end.
              </li>
            </ul>
          </div>

          {/* charge timing */}
          <div>
            <h2 className="font-display text-2xl text-ivory">
              When you are charged
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Prepaid orders:</span> your
                payment method is charged immediately when the payment
                succeeds at checkout. The order is confirmed only after our
                server verifies the payment.
              </li>
              <li>
                <span className="text-ivory">Cash on Delivery:</span> nothing
                is charged online — you pay the courier the full order amount
                at delivery. COD is available on orders up to{" "}
                {formatINR(COD_MAX_TOTAL)}; COD orders may receive a
                confirmation call before dispatch.
              </li>
              <li>
                <span className="text-ivory">Failed payments:</span> if money
                was debited but the order did not confirm, the amount is
                auto-reversed by your bank/Razorpay, typically within 5–7
                business days. Write to us with the payment reference if it
                takes longer.
              </li>
            </ul>
          </div>

          {/* pricing & gst */}
          <div>
            <h2 className="font-display text-2xl text-ivory">
              Pricing &amp; GST
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <p>
              All prices on this site are listed in Indian Rupees (₹) and are{" "}
              <span className="text-ivory">
                inclusive of GST (currently {GST_RATE}%)
              </span>{" "}
              — the price you see on the product page is the price you pay,
              plus any shipping fee shown at checkout. A tax invoice
              accompanies every order.
            </p>
          </div>

          {/* refunds & cancellations */}
          <div>
            <h2 className="flex items-center gap-3 font-display text-2xl text-ivory">
              <RotateCcw size={22} className="text-gold" aria-hidden />
              Refunds &amp; cancellations
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Cancelling an order:</span> write
                to{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                within 12 hours of ordering (before dispatch) with your order
                number. Prepaid cancellations are refunded in full.
              </li>
              <li>
                <span className="text-ivory">Refund route:</span> prepaid
                refunds always go back to the{" "}
                <span className="text-ivory">original payment method</span>{" "}
                (the same UPI account, card or wallet). COD order refunds are
                made by bank transfer to an account you confirm with us.
              </li>
              <li>
                <span className="text-ivory">Refund timeline:</span> we
                initiate refunds within{" "}
                <span className="text-ivory">7 business days</span> of
                approving the cancellation or of a returned item passing our
                quality check. Banks may take a further 3–5 business days to
                post the credit.
              </li>
              <li>
                The full return window, conditions and who pays return
                shipping are set out in{" "}
                <Link
                  href="/shipping-returns"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  Shipping &amp; Returns
                </Link>
                .
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
