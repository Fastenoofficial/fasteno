import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gem, Ruler, Shirt } from "lucide-react";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Size & Care Guides",
  description: `${SITE_NAME} style guides — how to tie a tie, choosing the right tie width and length, caring for silk, and wearing cufflinks with confidence.`,
};

const guides = [
  {
    href: "/guides/how-to-tie-a-tie",
    icon: Shirt,
    title: "How to Tie a Tie",
    blurb:
      "The four-in-hand and half-Windsor, step by step — plus which knot suits which collar.",
  },
  {
    href: "/guides/tie-size",
    icon: Ruler,
    title: "Tie Width & Length",
    blurb:
      "Classic vs slim widths, the right length for your height, and how the blade should sit.",
  },
  {
    href: "/guides/silk-care",
    icon: Shirt,
    title: "Caring for Silk",
    blurb:
      "Untying, storing, steaming and stain first-aid — make fine silk last for decades.",
  },
  {
    href: "/guides/cufflink-guide",
    icon: Gem,
    title: "The Cufflink Guide",
    blurb:
      "Cuff types, closure styles and occasions — everything about wearing cufflinks well.",
  },
];

export default function GuidesIndexPage() {
  return (
    <>
      <PageHeader
        eyebrow="Wear it well"
        title="Size & Care Guides"
        description="Short, practical guides from our stylists — so every piece you own is worn and kept at its best."
      />

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map(({ href, icon: Icon, title, blurb }) => (
            <Link
              key={href}
              href={href}
              className="lift group flex flex-col border border-line bg-card p-6"
            >
              <Icon size={22} className="text-gold" aria-hidden />
              <h2 className="mt-4 font-display text-xl text-ivory">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {blurb}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-gold transition-colors group-hover:text-gold-light">
                Read the guide <ArrowRight size={13} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
