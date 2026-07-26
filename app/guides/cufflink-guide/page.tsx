import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "The Cufflink Guide — Types, Cuffs & Occasions",
  description: `Cufflink closures explained, which shirts take cufflinks, and matching metals to your watch and wedding wardrobe — from ${SITE_NAME}.`,
};

export default function CufflinkGuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="Small hardware, large signal"
        title="The Cufflink Guide"
        description="Cufflinks are the rare accessory that is both jewellery and engineering. Here is everything you need to wear them well."
      />

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-16">
        <Link
          href="/guides"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted transition-colors hover:text-gold"
        >
          <ArrowLeft size={14} aria-hidden />
          All guides
        </Link>

        <div className="space-y-12 text-sm leading-relaxed text-muted">
          <div>
            <h2 className="font-display text-2xl text-ivory">
              First: the shirt
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">French (double) cuffs</span> — the
                classic home of the cufflink. The cuff folds back on itself and
                the link passes through all four holes, kissing the cuff edges
                together.
              </li>
              <li>
                <span className="text-ivory">Convertible cuffs</span> — button
                cuffs with an extra buttonhole; wear them buttoned on
                weekdays, linked on occasions.
              </li>
              <li>
                Standard barrel cuffs (one button, no second hole) do not take
                cufflinks — check before you gift.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">Closure types</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Whale-back / toggle</span> — flat
                head, straight post, hinged bar that flips flat to pass through
                and turns to lock. The easiest daily closure; most of our
                collection uses it.
              </li>
              <li>
                <span className="text-ivory">Bullet-back</span> — a hollow
                frame with a rotating bullet-shaped bar. Slim, secure,
                similarly easy.
              </li>
              <li>
                <span className="text-ivory">Chain-link</span> — two decorated
                faces joined by a chain; the most traditional, showing detail
                on both sides of the cuff.
              </li>
              <li>
                <span className="text-ivory">Fixed / knot</span> — rigid backs
                or silk knots; inexpensive, colourful, informal.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              Matching metals & moments
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Match your metals.</span> Silver
                links with a steel watch and silver buckle; gold with gold.
                Mother-of-pearl reads as neutral and pairs with either.
              </li>
              <li>
                <span className="text-ivory">Office</span> — restrained shapes,
                brushed finishes, no stones.
              </li>
              <li>
                <span className="text-ivory">Weddings & festive evenings</span>{" "}
                — this is where kundan, crystal and jewel tones belong. Let the
                cufflink echo the sherwani buttons or the brooch, not compete
                with them.
              </li>
              <li>
                <span className="text-ivory">Gifting</span> — cufflinks are the
                safest fine gift in menswear: one size fits all. Pair with a
                tie in a{" "}
                <Link href="/shop/gift-sets" className="text-gold hover:text-gold-light">
                  coordinated gift set
                </Link>
                .
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">Care</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                Wipe with a soft dry cloth after wear — skin oils dull plated
                finishes over time.
              </li>
              <li>
                Store pairs together in the box they arrived in; loose links in
                a drawer scratch each other.
              </li>
              <li>
                Keep enamel and stone-set links away from perfume and
                sanitiser — alcohol clouds the surface.
              </li>
            </ul>
          </div>

          <div className="border border-line bg-card p-6">
            <p className="text-ivory">
              Ready to link up?{" "}
              <Link
                href="/shop/cufflinks"
                className="inline-flex items-center gap-1.5 text-gold transition-colors hover:text-gold-light"
              >
                Shop cufflinks <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
