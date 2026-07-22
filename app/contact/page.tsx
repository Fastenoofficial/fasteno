import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, Phone, Scale } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { ContactForm } from "@/components/home/ContactForm";
import {
  GRIEVANCE_OFFICER,
  LEGAL_ENTITY_NAME,
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${SITE_NAME} — order help, gifting advice, bulk and wedding orders. Email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE}.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="We're listening"
        title="Contact Us"
        description="Order queries, styling advice, wedding and corporate gifting — write to us and a real person will reply within one business day."
      />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
          {/* contact details */}
          <div className="space-y-8">
            <div className="flex gap-4">
              <Mail size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
              <div>
                <h2 className="font-display text-lg text-ivory">Email</h2>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-1 block text-sm text-gold transition-colors hover:text-gold-light"
                >
                  {SUPPORT_EMAIL}
                </a>
                <p className="mt-1 text-xs text-muted">
                  Best for order issues and returns — include your order
                  number (FS-XXXXX).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Phone size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
              <div>
                <h2 className="font-display text-lg text-ivory">Phone / WhatsApp</h2>
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                  className="mt-1 block text-sm text-gold transition-colors hover:text-gold-light"
                >
                  {SUPPORT_PHONE}
                </a>
                <p className="mt-1 text-xs text-muted">
                  For quick questions on sizing, delivery timelines and COD.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
              <div>
                <h2 className="font-display text-lg text-ivory">Support hours</h2>
                <p className="mt-1 text-sm text-muted">
                  Monday – Saturday, 10:00 AM – 7:00 PM IST
                  <br />
                  Closed on Sundays and national holidays.
                </p>
              </div>
            </div>

            <div className="border border-line bg-card p-5">
              <p className="eyebrow mb-2">Before you write</p>
              <p className="text-sm leading-relaxed text-muted">
                Many answers live in our{" "}
                <Link
                  href="/faq"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  FAQ
                </Link>{" "}
                and{" "}
                <Link
                  href="/shipping-returns"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  Shipping &amp; Returns
                </Link>{" "}
                pages — delivery times, COD limits and how returns work.
              </p>
            </div>

            {/* grievance redressal — Consumer Protection (E-Commerce) Rules, 2020 */}
            <div className="border border-gold/30 bg-card p-5">
              <div className="flex items-center gap-2.5">
                <Scale size={16} className="shrink-0 text-gold" aria-hidden />
                <p className="eyebrow">Grievance Redressal</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                In accordance with the Consumer Protection (E-Commerce) Rules,
                2020, {LEGAL_ENTITY_NAME} has appointed a Grievance Officer
                for complaints about orders, products, refunds or this
                website:
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p className="text-ivory">{GRIEVANCE_OFFICER.name}</p>
                <p>
                  <a
                    href={`mailto:${GRIEVANCE_OFFICER.email}`}
                    className="text-gold transition-colors hover:text-gold-light"
                  >
                    {GRIEVANCE_OFFICER.email}
                  </a>{" "}
                  · {GRIEVANCE_OFFICER.phone}
                </p>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {GRIEVANCE_OFFICER.sla} Please quote your order number
                (FS-XXXXX) and mark the subject &ldquo;Grievance&rdquo;. If
                you are not satisfied with the resolution, you may escalate to
                the consumer dispute redressal fora under the Consumer
                Protection Act, 2019, including via the National Consumer
                Helpline (1915 /{" "}
                <a
                  href="https://consumerhelpline.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold transition-colors hover:text-gold-light"
                >
                  consumerhelpline.gov.in
                </a>
                ).
              </p>
            </div>
          </div>

          {/* form */}
          <div>
            <h2 className="font-display text-2xl text-ivory md:text-3xl">
              Send us a message
            </h2>
            <div className="gold-rule mt-4 mb-8" />
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
