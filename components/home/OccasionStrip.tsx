import Link from "next/link";
import { Briefcase, Gem, Gift, Sparkles } from "lucide-react";

/** Occasion merchandising strip. Tags match lib/seed-data.ts product tags
 *  and link to the shop with the ProductQuery `tag` param. */
const occasions = [
  {
    tag: "wedding",
    label: "The Wedding",
    blurb: "Sherwani brooches, ivory silks and heirloom sets for the big day.",
    icon: Gem,
  },
  {
    tag: "office",
    label: "The Boardroom",
    blurb: "Sharp ties and understated cufflinks that mean business.",
    icon: Briefcase,
  },
  {
    tag: "festive",
    label: "The Festive Evening",
    blurb: "Kundan, crystal and jewel tones for celebration nights.",
    icon: Sparkles,
  },
  {
    tag: "gift",
    label: "The Gift",
    blurb: "Coordinated boxes that arrive ready to be given.",
    icon: Gift,
  },
];

export function OccasionStrip() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
      {occasions.map(({ tag, label, blurb, icon: Icon }) => (
        <Link
          key={tag}
          href={`/shop?tag=${tag}`}
          className="lift group flex flex-col rounded-2xl border border-line-soft bg-card p-6 shadow-[var(--shadow-card)]"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-gold">
            <Icon size={20} aria-hidden />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-ivory transition-colors group-hover:text-gold">
            {label}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
            {blurb}
          </p>
          <p className="eyebrow mt-6">Shop the occasion →</p>
        </Link>
      ))}
    </div>
  );
}
