import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/home/PageHeader";
import { isDemoMode, SITE_NAME, SUPPORT_EMAIL } from "@/lib/config";
import { TrackOrderForm } from "./TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Order",
  description: `Track your ${SITE_NAME} order — enter your order number (FS-XXXXX) and the email used at checkout to see live status, courier and tracking details.`,
};

export default function TrackOrderPage() {
  return (
    <>
      <PageHeader
        eyebrow="Where is my order?"
        title="Track Your Order"
        description="Enter your order number and the email you used at checkout — both must match the order. No account needed."
      />

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-16">
        {isDemoMode ? (
          <div className="border border-gold/40 bg-card px-6 py-8 text-sm leading-relaxed text-muted">
            <p className="eyebrow mb-2">Demo mode</p>
            <p>
              The store is currently running in demo mode, so orders are not
              stored on a server — each demo order lives only in the browser
              that placed it. To revisit a demo order, open the confirmation
              link from that same browser. Once the store is connected to
              Supabase, this page looks up real orders by order number and
              email.
            </p>
          </div>
        ) : (
          <TrackOrderForm />
        )}

        <div className="mt-10 border-t border-line pt-6 text-sm leading-relaxed text-muted">
          <p>
            Signed in? Your full order history is in{" "}
            <Link
              href="/account/orders"
              className="text-gold transition-colors hover:text-gold-light"
            >
              your account
            </Link>
            . Can&rsquo;t find an order or need help? Write to{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-gold transition-colors hover:text-gold-light"
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            with your order number.
          </p>
        </div>
      </section>
    </>
  );
}
