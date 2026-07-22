import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, PackageCheck, RefreshCcw, Truck } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  SITE_NAME,
  SUPPORT_EMAIL,
} from "@/lib/config";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: `${SITE_NAME} shipping and returns policy — free shipping over ${formatINR(FREE_SHIPPING_THRESHOLD)}, Cash on Delivery across India, dispatch in 1–2 business days, 7-day easy returns.`,
};

const highlights = [
  {
    icon: Truck,
    title: `Free over ${formatINR(FREE_SHIPPING_THRESHOLD)}`,
    text: `Flat ${formatINR(SHIPPING_FEE)} below the threshold.`,
  },
  {
    icon: PackageCheck,
    title: "Dispatch in 1–2 days",
    text: "Tracked courier, email updates at every step.",
  },
  {
    icon: BadgeCheck,
    title: "COD available",
    text: "Pay at your door across most Indian pincodes.",
  },
  {
    icon: RefreshCcw,
    title: "7-day easy returns",
    text: "Unused, in original box — no questions asked.",
  },
];

export default function ShippingReturnsPage() {
  return (
    <>
      <PageHeader
        eyebrow="The fine print, kept simple"
        title="Shipping & Returns"
        description="How your order travels to you, and how it comes back if it must."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
        {/* highlights */}
        <div className="mb-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {highlights.map(({ icon: Icon, title, text }) => (
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
          {/* shipping */}
          <div>
            <h2 className="font-display text-2xl text-ivory">Shipping</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Charges:</span> shipping is free
                on orders of {formatINR(FREE_SHIPPING_THRESHOLD)} and above.
                Orders below that carry a flat fee of {formatINR(SHIPPING_FEE)},
                however many items you order.
              </li>
              <li>
                <span className="text-ivory">Dispatch:</span> orders placed
                before 2 PM IST on a business day are usually packed the same
                day; all orders leave our studio within 1–2 business days.
              </li>
              <li>
                <span className="text-ivory">Delivery time:</span> 2–4 business
                days to metro cities (Delhi NCR, Mumbai, Bengaluru, Hyderabad,
                Chennai, Kolkata, Pune, Ahmedabad) and 4–7 business days
                elsewhere in India.
              </li>
              <li>
                <span className="text-ivory">Tracking:</span> a tracking link
                is emailed the moment your parcel ships. You can also check
                status anytime on the{" "}
                <Link
                  href="/track-order"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  Track Order
                </Link>{" "}
                page with just your order number and email, or from your{" "}
                <Link
                  href="/account/orders"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  account
                </Link>
                .
              </li>
              <li>
                <span className="text-ivory">Coverage:</span> we currently ship
                only within India. International shipping is planned for a
                future release.
              </li>
              <li>
                <span className="text-ivory">Packaging:</span> every order
                arrives in a rigid matte-black gift box with gold foiling —
                safe in transit and ready to gift.
              </li>
            </ul>
          </div>

          {/* cod */}
          <div>
            <h2 className="font-display text-2xl text-ivory">
              Cash on Delivery
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                COD is offered at most serviceable pincodes; the option appears
                at checkout once your address is entered.
              </li>
              <li>
                Please keep the exact amount ready — couriers accept cash and,
                at many pincodes, UPI at the doorstep.
              </li>
              <li>
                Repeated refused COD deliveries may lead us to request prepaid
                payment on future orders.
              </li>
            </ul>
          </div>

          {/* returns */}
          <div>
            <h2 className="font-display text-2xl text-ivory">
              Returns &amp; Refunds
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Window:</span> initiate a return
                within 7 days of delivery.
              </li>
              <li>
                <span className="text-ivory">Condition:</span> items must be
                unused, unworn and returned in their original gift box with
                all inserts. Ties should be untied and unstained; cufflink and
                button sets complete.
              </li>
              <li>
                <span className="text-ivory">How:</span> email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                with your order number (FS-XXXXX) and the item(s) to return.
                We arrange a reverse pickup where available; otherwise we
                share a return address and reimburse reasonable courier costs
                for defective items.
              </li>
              <li>
                <span className="text-ivory">Who pays return shipping:</span>{" "}
                for customer-initiated returns (changed your mind, wrong
                choice), return shipping is borne by the customer — either the
                reverse-pickup fee we quote up front, or your own courier cost
                if you ship it yourself. If the item is{" "}
                <span className="text-ivory">defective, damaged or not what
                you ordered</span>, {SITE_NAME} pays: we arrange and pay for
                the reverse pickup, or fully reimburse your courier cost.
              </li>
              <li>
                <span className="text-ivory">Refund timeline:</span> refunds
                are processed within{" "}
                <span className="text-ivory">7 business days</span> of the
                returned item passing our quality check — to the original
                payment method (same UPI account, card or wallet) for prepaid
                orders, or by bank transfer (details collected securely over
                email) for COD orders. Your bank may take a further 3–5
                business days to post the credit.
              </li>
              <li>
                <span className="text-ivory">Exclusions:</span> personalised or
                engraved pieces and items marked final-sale are non-returnable
                unless damaged or defective on arrival.
              </li>
              <li>
                <span className="text-ivory">Damaged on arrival?</span> Send us
                photos within 48 hours of delivery and we will replace the item
                or refund you in full, shipping included.
              </li>
            </ul>
          </div>

          {/* exchanges */}
          <div>
            <h2 className="font-display text-2xl text-ivory">Exchanges</h2>
            <div className="gold-rule mt-3 mb-5" />
            <p>
              We handle exchanges as a return plus a fresh order — it is the
              fastest way to get the right piece to you.
            </p>
            <ol className="mt-4 list-decimal space-y-3 pl-5">
              <li>
                Email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                within the 7-day window with your order number and the item
                you&rsquo;d like instead — we can reserve the new piece for
                you.
              </li>
              <li>
                Return the original item (unused, in its original box) via the
                reverse pickup we arrange or your own courier.
              </li>
              <li>
                Place the new order whenever you are ready; once the returned
                item passes quality check, the refund for it is processed
                within 7 business days as described above.
              </li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
