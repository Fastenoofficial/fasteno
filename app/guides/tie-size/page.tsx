import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Tie Width & Length Guide",
  description: `Choosing between classic and slim ties, the right tie length for your height, and how the blade should sit at your waist — sizing advice from ${SITE_NAME}.`,
};

export default function TieSizePage() {
  return (
    <>
      <PageHeader
        eyebrow="Proportions matter"
        title="Tie Width & Length"
        description="A tie flatters when its proportions match your frame, your lapel and your collar. Here is how to get all three right."
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
            <h2 className="font-display text-2xl text-ivory">Width</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Classic — 8 to 9 cm</span> at the
                widest point. The traditional width; pairs with structured
                jackets, wider lapels and formal occasions. Safe, timeless,
                correct.
              </li>
              <li>
                <span className="text-ivory">Slim — 6 to 7 cm.</span> Modern
                and sharp; pairs with slim-cut suits, narrow lapels and
                slighter frames. Avoid with broad shoulders or wide lapels —
                the contrast works against you.
              </li>
              <li>
                <span className="text-ivory">The rule</span> — match your tie
                width to your lapel width. Stand in front of a mirror: the tie
                at its widest should roughly echo the lapel at its widest.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">Length</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                A standard tie is <span className="text-ivory">145–150 cm</span>{" "}
                long and suits heights up to about 6&prime;0&Prime; (183 cm).
              </li>
              <li>
                Taller than that, or using a length-hungry knot like the
                half-Windsor? Look for a long tie of{" "}
                <span className="text-ivory">155 cm or more</span>.
              </li>
              <li>
                <span className="text-ivory">Where it should end</span> — the
                tip of the wide blade should just touch the centre of your
                waistband or belt buckle. Above it looks outgrown; below it
                looks borrowed.
              </li>
              <li>
                The narrow end tucks into the keeper loop at the back — it
                should never hang visibly below the wide blade.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              Pocket squares & brooches
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                Our pocket squares are cut at{" "}
                <span className="text-ivory">30–33 cm square</span> — sized to
                sit in a suit breast pocket with body, without bulging.
              </li>
              <li>
                A pocket square should <span className="text-ivory">relate</span>{" "}
                to the tie, never repeat it — echo one colour from the tie, or
                keep it ivory and let the texture speak.
              </li>
              <li>
                Sherwani brooches pin through the buttonhole or lapel seam,
                chain draping toward the shoulder. Pin once, firmly — repeated
                pinning marks fine fabric.
              </li>
            </ul>
          </div>

          <div className="border border-line bg-card p-6">
            <p className="text-ivory">
              Found your proportions?{" "}
              <Link
                href="/shop/ties"
                className="inline-flex items-center gap-1.5 text-gold transition-colors hover:text-gold-light"
              >
                Shop ties by width <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
