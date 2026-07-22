import type { Metadata } from "next";
import { Gem, MapPin, Package, Scissors } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/home/PageHeader";
import { SITE_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "About Us",
  description: `The story of ${SITE_NAME} — a premium Indian house of men's formal accessories: silk ties, cufflinks, brooches, pocket squares and gift sets.`,
};

const values = [
  {
    icon: Gem,
    title: "Material honesty",
    text: "Mulberry silk that is actually mulberry silk. Brass, horn, enamel and mother-of-pearl, named plainly on every product page.",
  },
  {
    icon: Scissors,
    title: "Craft over churn",
    text: "Small batches, hand-finished tipping, hand-rolled hems. We would rather sell out than cut a corner.",
  },
  {
    icon: Package,
    title: "Made to be gifted",
    text: "Every piece ships in a rigid matte-black box with gold foiling — because half our parcels are opened by someone other than the buyer.",
  },
  {
    icon: MapPin,
    title: "Rooted in India",
    text: "Priced in rupees, sized for Indian formals — from bandhgalas to boardroom suits — with COD and easy returns nationwide.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow={`About ${SITE_NAME}`}
        title="The finishing touch, taken seriously"
        description="We are a small Indian house devoted to the details of formal dressing — the knot, the clasp, the fold and the pin."
      />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16">
          {/* story */}
          <div className="space-y-5 text-sm leading-relaxed text-muted">
            <h2 className="font-display text-2xl text-ivory md:text-3xl">
              Why we exist
            </h2>
            <div className="gold-rule" />
            <p>
              Every Indian man owns the big things — the suit, the sherwani,
              the bandhgala. But walk through any wedding or boardroom and you
              will see where wardrobes quietly fall short: a limp knot, a
              missing pocket square, plastic buttons on a good blazer.
              {` ${SITE_NAME} `} was founded to fix exactly that.
            </p>
            <p>
              We make and curate the small pieces that complete formal attire:
              silk ties with wool interlinings that hold a dimple all day,
              cufflinks in brass, enamel and mother-of-pearl, kundan and
              crystal brooches for sherwanis, hand-rolled pocket squares, and
              premium button sets that upgrade a jacket in ten minutes.
            </p>
            <p>
              Our pricing sits deliberately between the marketplace bin and the
              imported-luxury shelf. That middle ground — honest materials,
              careful finishing, fair rupee pricing — is where we believe the
              best value in menswear lives.
            </p>
            <p>
              Everything ships gift-ready from our studio, with free shipping
              on orders over ₹1,499, Cash on Delivery across India and 7-day
              easy returns. If a piece does not finish your outfit the way you
              hoped, send it back — no lectures, no forms in triplicate.
            </p>
          </div>

          {/* values */}
          <div className="space-y-8">
            <h2 className="font-display text-2xl text-ivory md:text-3xl">
              What we stand by
            </h2>
            <div className="gold-rule" />
            {values.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <Icon size={20} className="mt-1 shrink-0 text-gold" aria-hidden />
                <div>
                  <h3 className="font-display text-lg text-ivory">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* closing CTA */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6">
          <p className="eyebrow mb-3">Start with the details</p>
          <h2 className="font-display text-3xl text-ivory md:text-4xl">
            Finish the look
          </h2>
          <div className="mt-8">
            <Button href="/shop" size="lg">
              Shop the Collection
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
