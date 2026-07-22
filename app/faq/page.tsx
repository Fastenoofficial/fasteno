import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/config";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about ${SITE_NAME} — shipping across India, Cash on Delivery, 7-day returns, payments via Razorpay, gifting and product care.`,
};

const sections: { title: string; faqs: { q: string; a: string }[] }[] = [
  {
    title: "Orders & Payment",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "We accept UPI, credit and debit cards, netbanking and popular wallets — all processed securely through Razorpay. Cash on Delivery (COD) is also available across India.",
      },
      {
        q: "Is Cash on Delivery available at my pincode?",
        a: "COD is available at most serviceable pincodes in India. You'll see the option at checkout after entering your address — if COD isn't offered for your pincode, prepaid options via Razorpay are always available.",
      },
      {
        q: "Can I modify or cancel my order after placing it?",
        a: "Yes — write to us within 12 hours of placing the order (before it is packed and handed to the courier) and we'll modify or cancel it with a full refund for prepaid orders. Once shipped, please use the 7-day return window instead.",
      },
      {
        q: "Do you provide GST invoices?",
        a: "Every order ships with a tax invoice. If you need the invoice in a company name with a GSTIN for corporate or bulk orders, mention it at checkout or email us with your order number.",
      },
    ],
  },
  {
    title: "Shipping & Delivery",
    faqs: [
      {
        q: "How much does shipping cost?",
        a: "Shipping is free on all orders of ₹1,499 and above. Below that, a flat fee of ₹99 applies — regardless of how many items are in the order.",
      },
      {
        q: "How do I track my order?",
        a: "Use the Track Order page — enter your order number (FS-XXXXX) and the email you used at checkout to see live status, courier and AWB details. No account needed. Signed-in customers can also see every order under Account → Orders.",
      },
      {
        q: "How long does delivery take?",
        a: "Orders are dispatched within 1–2 business days. Metros typically receive parcels in 2–4 business days; the rest of India in 4–7 business days. You'll receive a tracking link by email as soon as your order ships.",
      },
      {
        q: "Do you ship outside India?",
        a: "Not yet. In v1 we ship only within India. International shipping is on our roadmap — join the newsletter to hear when it launches.",
      },
    ],
  },
  {
    title: "Returns & Exchanges",
    faqs: [
      {
        q: "What is your return policy?",
        a: "7-day easy returns. If a piece isn't right, initiate a return within 7 days of delivery — items must be unused, unworn and in their original gift box. Refunds are issued to the original payment method (or by bank transfer for COD orders) within 5–7 business days of the item reaching us.",
      },
      {
        q: "Are any items non-returnable?",
        a: "Personalised or engraved items and products marked final-sale cannot be returned unless they arrive damaged or defective — in which case we replace or refund them in full, including shipping.",
      },
      {
        q: "How do I start a return?",
        a: "Email us at our support address with your order number (FS-XXXXX) and the item you'd like to return. We'll arrange a reverse pickup where available, or share the return address if your pincode isn't serviced for pickup.",
      },
    ],
  },
  {
    title: "Products & Care",
    faqs: [
      {
        q: "How should I care for a silk tie?",
        a: "Untie it fully after each wear (never leave the knot in), hang or loosely roll it, and keep it out of direct sun. For stains, dry clean only — water and silk are poor friends.",
      },
      {
        q: "Will the brooches work on a sherwani or bandhgala?",
        a: "Yes — our brooches and lapel pins use sturdy pin-and-clasp backs designed for heavier Indian fabrics like brocade and raw silk, as well as suit lapels.",
      },
      {
        q: "Are your gift sets ready to give?",
        a: "Completely. Every order — sets and single pieces alike — ships in a rigid matte-black box with gold foiling. Gift sets additionally come with a coordinated presentation tray inside.",
      },
      {
        q: "How do I choose between button sets?",
        a: "Match the metal to your hardware: golden brass warms up navy and earth tones; antique silver suits greys and black; horn and mother-of-pearl are for understated, natural looks. Each product page lists sizes and the number of buttons in the set.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Help centre"
        title="Frequently Asked Questions"
        description="Everything you need to know about ordering, shipping, returns and caring for your accessories."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="space-y-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-2xl text-ivory">
                {section.title}
              </h2>
              <div className="gold-rule mt-3 mb-6" />
              <div className="space-y-3">
                {section.faqs.map((faq) => (
                  <details
                    key={faq.q}
                    className="group border border-line bg-card"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ivory transition-colors hover:text-gold [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <ChevronDown
                        size={16}
                        aria-hidden
                        className="shrink-0 text-gold transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-muted">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* still stuck */}
        <div className="mt-14 border border-line bg-card px-6 py-8 text-center">
          <p className="eyebrow mb-2">Still have a question?</p>
          <p className="text-sm leading-relaxed text-muted">
            Write to{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-gold transition-colors hover:text-gold-light"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            or call {SUPPORT_PHONE} (Mon–Sat, 10 AM–7 PM IST). You can also use
            the{" "}
            <Link
              href="/contact"
              className="text-gold transition-colors hover:text-gold-light"
            >
              contact form
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
