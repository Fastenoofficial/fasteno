import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "How to Tie a Tie — Four-in-Hand & Half-Windsor",
  description: `Learn to tie a tie in under two minutes. Step-by-step four-in-hand and half-Windsor knots, plus which knot suits which collar — from ${SITE_NAME}.`,
};

const fourInHand = [
  "Drape the tie around your collar, seams inward, with the wide blade on your right hanging about 30 cm lower than the narrow end.",
  "Cross the wide blade over the narrow end, just below the collar.",
  "Wrap the wide blade behind the narrow end, then across the front once more.",
  "Push the wide blade up through the loop at your neck, from behind.",
  "Feed the tip down through the horizontal band you created in step 3.",
  "Hold the narrow end and slide the knot up gently. Pinch below the knot as you tighten to set a small dimple.",
];

const halfWindsor = [
  "Start as before, but with the wide blade hanging lower — about 35 cm below the narrow end.",
  "Cross the wide blade over the narrow end, then bring it up through the neck loop and drop it down to the left.",
  "Pass the wide blade behind the narrow end, right to left.",
  "Bring it across the front, left to right, forming the face of the knot.",
  "Push it up through the neck loop from behind once more.",
  "Feed the tip down through the front band, tighten slowly, and centre the knot with a dimple.",
];

export default function HowToTieATiePage() {
  return (
    <>
      <PageHeader
        eyebrow="Two knots are enough"
        title="How to Tie a Tie"
        description="Master the four-in-hand for every day and the half-Windsor for occasions — the only two knots a well-dressed man needs."
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
              The Four-in-Hand — your everyday knot
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <p className="mb-5">
              Slightly asymmetric, narrow and effortless — the four-in-hand is
              the knot for office wear, slim and classic ties alike. It suits
              standard and narrow collars and works with every tie in our
              collection.
            </p>
            <ol className="list-decimal space-y-3 pl-5">
              {fourInHand.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              The Half-Windsor — for occasions
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <p className="mb-5">
              Fuller, symmetric and triangular — the half-Windsor sits
              beautifully in a spread collar and photographs well, which makes
              it the wedding and interview knot. It uses more length, so allow
              the wide blade to start lower.
            </p>
            <ol className="list-decimal space-y-3 pl-5">
              {halfWindsor.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              Which knot, which collar?
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Standard / narrow collar</span> —
                four-in-hand. A big knot crowds a small collar.
              </li>
              <li>
                <span className="text-ivory">Spread / cutaway collar</span> —
                half-Windsor. A small knot looks lost in a wide opening.
              </li>
              <li>
                <span className="text-ivory">Bandhgala or sherwani</span> — no
                tie at all; reach for a{" "}
                <Link href="/shop/brooches" className="text-gold hover:text-gold-light">
                  brooch
                </Link>{" "}
                or{" "}
                <Link href="/shop/pocket-squares" className="text-gold hover:text-gold-light">
                  pocket square
                </Link>{" "}
                instead.
              </li>
              <li>
                <span className="text-ivory">The dimple</span> — pinch a small
                fold under the knot as you tighten. It catches the light and
                signals a tie knotted by hand, not on a hook.
              </li>
            </ul>
          </div>

          <div className="border border-line bg-card p-6">
            <p className="text-ivory">
              Practice with the real thing —{" "}
              <Link
                href="/shop/ties"
                className="inline-flex items-center gap-1.5 text-gold transition-colors hover:text-gold-light"
              >
                shop our silk ties <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
