import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Caring for Silk — Ties & Pocket Squares",
  description: `How to untie, store, steam and rescue silk ties and pocket squares. Simple care habits that make fine silk last decades — from ${SITE_NAME}.`,
};

export default function SilkCarePage() {
  return (
    <>
      <PageHeader
        eyebrow="Kept well, worn for decades"
        title="Caring for Silk"
        description="Silk rewards small habits. Five minutes of care after each wear keeps a tie looking new for years."
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
            <h2 className="font-display text-2xl text-ivory">After each wear</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Always untie fully.</span> Reverse
                the knot — never pull the narrow end through. Leaving a tie
                knotted overnight sets creases into the interlining that never
                fully recover.
              </li>
              <li>
                <span className="text-ivory">Hang or roll.</span> Hang ties on
                a rounded bar for a day so wrinkles fall out, then store flat
                or loosely rolled. Roll pocket squares around a cardboard tube
                or store flat — hard folds crease the hems.
              </li>
              <li>
                <span className="text-ivory">Rest your silks.</span> A tie worn
                two days in a row holds its wrinkles. Rotate — silk recovers
                its body between wears.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              Wrinkles & steam
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Never iron silk directly.</span>{" "}
                Direct heat flattens the weave and leaves permanent shine.
              </li>
              <li>
                <span className="text-ivory">Steam instead.</span> Hang the tie
                in the bathroom during a hot shower, or hold a steamer 15 cm
                away. Most wrinkles release in minutes.
              </li>
              <li>
                If you must press, use the lowest setting with a clean cotton
                cloth between iron and silk, and never press the edges flat — a
                fine tie&rsquo;s edges should stay softly rolled.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">
              Stain first-aid
            </h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <span className="text-ivory">Blot, never rub.</span> Press a
                clean dry cloth on the spill immediately. Rubbing pushes the
                stain into the weave and abrades the surface.
              </li>
              <li>
                <span className="text-ivory">No water on silk.</span> Water
                spots silk and sets water-soluble stains. Resist the instinct.
              </li>
              <li>
                <span className="text-ivory">Go professional.</span> For
                anything beyond a blotted drop, take the piece to a dry cleaner
                who handles silk — and point out the stain and what caused it.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ivory">Storage</h2>
            <div className="gold-rule mt-3 mb-5" />
            <ul className="list-disc space-y-3 pl-5">
              <li>
                Store away from direct sunlight — silk dyes fade under UV.
              </li>
              <li>
                Use a breathable drawer or box, never sealed plastic; trapped
                humidity dulls silk.
              </li>
              <li>
                Travelling? Roll the tie loosely and tuck it inside a shoe or
                along the case edge — never fold it flat under weight.
              </li>
            </ul>
          </div>

          <div className="border border-line bg-card p-6">
            <p className="text-ivory">
              Silk worth caring for —{" "}
              <Link
                href="/shop/pocket-squares"
                className="inline-flex items-center gap-1.5 text-gold transition-colors hover:text-gold-light"
              >
                shop silk pocket squares <ArrowRight size={13} aria-hidden />
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
