import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/home/PageHeader";
import {
  LEGAL_ADDRESS,
  LEGAL_ENTITY_NAME,
  SITE_NAME,
  SUPPORT_EMAIL,
} from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for shopping at ${SITE_NAME} — orders, pricing in INR, payments via Razorpay and COD, shipping within India, returns and governing law.`,
};

const updated = "17 July 2026";

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Last updated · ${updated}`}
        title="Terms of Service"
        description="The agreement between you and us when you use this site and place an order. Written to be read, not skimmed past."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="space-y-10 text-sm leading-relaxed text-muted">
          <div>
            <h2 className="font-display text-2xl text-ivory">
              1. Acceptance of terms
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              This website and store are operated by{" "}
              <span className="text-ivory">{LEGAL_ENTITY_NAME}</span> —{" "}
              {LEGAL_ADDRESS}. By browsing this website or placing an order
              with {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), you
              agree to these terms and to our{" "}
              <Link
                href="/privacy"
                className="text-gold transition-colors hover:text-gold-light"
              >
                Privacy Policy
              </Link>
              . If you do not agree, please do not use the site.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              2. Products &amp; pricing
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <ul className="list-disc space-y-2 pl-5">
              <li>
                All prices are listed in Indian Rupees (₹) and are inclusive of
                applicable GST unless stated otherwise.
              </li>
              <li>
                Product imagery is illustrative; minor variations in shade and
                finish are natural for handcrafted items and materials like
                mother-of-pearl and horn.
              </li>
              <li>
                We may correct pricing or description errors at any time. If an
                error affects an order you have already placed, we will contact
                you to reconfirm or cancel with a full refund.
              </li>
              <li>
                Strike-through &ldquo;compare at&rdquo; prices indicate our own
                previous listed price for that item.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              3. Orders &amp; payment
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <ul className="list-disc space-y-2 pl-5">
              <li>
                An order is accepted when we send the order confirmation email.
                We may decline or cancel orders for suspected fraud, pricing
                errors or stock issues — with a full refund if already paid.
              </li>
              <li>
                Online payments (UPI, cards, netbanking, wallets) are processed
                by Razorpay. We never store your payment credentials.
              </li>
              <li>
                Cash on Delivery is available at serviceable pincodes. COD
                orders may receive a confirmation call before dispatch.
              </li>
              <li>Guest checkout is available; an account is optional.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              4. Shipping, returns &amp; refunds
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              Shipping timelines, charges, the 7-day return window and refund
              process are set out in{" "}
              <Link
                href="/shipping-returns"
                className="text-gold transition-colors hover:text-gold-light"
              >
                Shipping &amp; Returns
              </Link>
              , which forms part of these terms. Risk in the goods passes to
              you on delivery; title passes on full payment.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              5. Accounts
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              You are responsible for keeping your account credentials
              confidential and for activity under your account. We may suspend
              accounts used for fraud, abuse of return policies or resale at
              scale without authorisation.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              6. Intellectual property
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              All content on this site — the {SITE_NAME} name, product designs,
              imagery, copy and code — belongs to us or our licensors. You may
              not reproduce or use it commercially without written permission.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              7. Limitation of liability
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              To the fullest extent permitted by law, our liability for any
              claim arising from an order is limited to the amount you paid for
              that order. Nothing in these terms limits liability that cannot
              be limited under Indian law, including under applicable consumer
              protection legislation.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              8. Governing law &amp; disputes
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              These terms are governed by the laws of India. Disputes are
              subject to the exclusive jurisdiction of the courts of New Delhi,
              India. Nothing here restricts your rights under the Consumer
              Protection Act, 2019.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              9. Contact
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              Questions about these terms? Write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-gold transition-colors hover:text-gold-light"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              or use the{" "}
              <Link
                href="/contact"
                className="text-gold transition-colors hover:text-gold-light"
              >
                contact page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
