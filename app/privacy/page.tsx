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
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses and protects your personal information — orders, accounts, payments via Razorpay and cookies.`,
};

const updated = "17 July 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow={`Last updated · ${updated}`}
        title="Privacy Policy"
        description="Plain-language answers to what we collect, why we collect it, and the choices you have."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="space-y-10 text-sm leading-relaxed text-muted">
          <div>
            <h2 className="font-display text-2xl text-ivory">
              1. Who we are
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this
              online store selling men&rsquo;s formal accessories in India.
              The store is operated by{" "}
              <span className="text-ivory">{LEGAL_ENTITY_NAME}</span> —{" "}
              {LEGAL_ADDRESS}. This policy explains how we handle personal
              information when you browse, shop or contact us. For any
              privacy question, write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-gold transition-colors hover:text-gold-light"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              2. What we collect
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-ivory">Order details (checkout):</span>{" "}
                name, email, phone number and shipping address — needed to
                deliver your order and send updates. Collected with your
                consent when you place the order; providing them is necessary
                to fulfil it.
              </li>
              <li>
                <span className="text-ivory">Newsletter:</span> your email
                address only, collected when you subscribe. Subscribing is
                your consent to receive marketing emails from us; we record
                the date of consent. Every email carries an unsubscribe link,
                and you can withdraw consent at any time (see section 7).
              </li>
              <li>
                <span className="text-ivory">Account information:</span> if you
                create an account, your login email, saved addresses, order
                history and wishlist.
              </li>
              <li>
                <span className="text-ivory">Payment information:</span>{" "}
                payments are processed by Razorpay. We never see or store your
                card number, UPI PIN or banking credentials — we receive only a
                payment confirmation and reference ID.
              </li>
              <li>
                <span className="text-ivory">Device data:</span> basic
                technical information (browser, approximate location, pages
                visited) used to keep the site fast and secure.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              3. How we use it
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <ul className="list-disc space-y-2 pl-5">
              <li>Processing and delivering orders, including COD verification calls.</li>
              <li>Sending transactional messages — confirmations, shipping updates, refund notices.</li>
              <li>Answering support requests and processing returns.</li>
              <li>
                Sending the newsletter — only if you subscribe, and every email
                carries a one-click unsubscribe.
              </li>
              <li>Preventing fraud and meeting legal obligations (tax invoices, payment records).</li>
            </ul>
            <p className="mt-3">
              We do <span className="text-ivory">not</span> sell or rent your
              personal information to anyone.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              4. Who we share it with
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="text-ivory">Couriers</span> — name, phone and
                address, to deliver your parcel.
              </li>
              <li>
                <span className="text-ivory">Razorpay</span> — to process
                payments securely (see Razorpay&rsquo;s own privacy policy).
              </li>
              <li>
                <span className="text-ivory">Infrastructure providers</span> —
                our hosting and database providers store data on our behalf
                under contractual safeguards.
              </li>
              <li>
                <span className="text-ivory">Authorities</span> — only when
                required by applicable Indian law.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              5. Cookies &amp; local storage
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              We use strictly necessary cookies and browser local storage to
              keep you signed in, remember your cart and wishlist, and secure
              checkout. We do not run third-party advertising trackers. You
              can clear local storage and cookies from your browser at any
              time — your cart will simply reset.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              6. Data retention &amp; security
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              Order and invoice records are retained as long as Indian tax law
              requires. Account data is kept until you ask us to delete it.
              Data is encrypted in transit (HTTPS) and access is restricted to
              staff who need it to serve you.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              7. Your rights &amp; withdrawing consent
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              Under India&rsquo;s Digital Personal Data Protection Act, 2023
              (DPDP Act), you are the data principal for the personal data we
              process. You have the right to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <span className="text-ivory">Access</span> — request a summary
                of the personal data we hold about you and how it is
                processed.
              </li>
              <li>
                <span className="text-ivory">Correction &amp; erasure</span> —
                ask us to correct inaccurate data, complete incomplete data,
                or delete your account and associated data (subject to
                legally required records such as tax invoices).
              </li>
              <li>
                <span className="text-ivory">Withdraw consent</span> — at any
                time, with effect going forward. For the newsletter, use the
                unsubscribe link in any email or write to us; for other
                processing based on consent, email us and we will stop within
                a reasonable time.
              </li>
              <li>
                <span className="text-ivory">Grievance redressal</span> —
                complain to our Grievance Officer (details on the{" "}
                <Link
                  href="/contact"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  contact page
                </Link>
                ) and, if unresolved, to the Data Protection Board of India.
              </li>
              <li>
                <span className="text-ivory">Nominate</span> — designate
                another person to exercise these rights on your behalf in
                case of death or incapacity.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-gold transition-colors hover:text-gold-light"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              from the address associated with your order or account and we
              will respond within 30 days.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              8. Changes to this policy
            </h2>
            <div className="gold-rule mt-3 mb-4" />
            <p>
              We may update this policy as the store evolves; the &ldquo;last
              updated&rdquo; date above always reflects the current version.
              Material changes will be announced on the site. See also our{" "}
              <Link
                href="/terms"
                className="text-gold transition-colors hover:text-gold-light"
              >
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
