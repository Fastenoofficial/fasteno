import { Gem, Package, Scissors, ShieldCheck } from "lucide-react";

const pillars = [
  {
    icon: Scissors,
    title: "Cut & Finished by Hand",
    text: "Ties tipped and slip-stitched by hand; squares hand-rolled at the hem. Machines make things fast — hands make them last.",
  },
  {
    icon: Gem,
    title: "Honest Materials",
    text: "Mulberry silk, mother-of-pearl, brass, enamel and horn. Every listing names its material — no vague 'premium blend'.",
  },
  {
    icon: Package,
    title: "Gift-Ready, Always",
    text: "Every order leaves us in a rigid matte-black box with a gold-foil monogram. Nothing to wrap, nothing to explain.",
  },
  {
    icon: ShieldCheck,
    title: "Stand-Behind-It Service",
    text: "7-day easy returns, Cash on Delivery across India, and free shipping on orders over ₹1,499.",
  },
];

/** Brand-story band — the craftsmanship promise behind Fasteno Shyama. */
export function CraftsmanshipBand() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
          {/* story */}
          <div>
            <p className="eyebrow mb-3">The Fasteno Shyama standard</p>
            <h2 className="font-display text-3xl leading-snug text-ivory md:text-4xl">
              Small things, taken seriously.
            </h2>
            <div className="gold-rule mt-4" />
            <p className="mt-5 text-sm leading-relaxed text-muted">
              A tie is a metre of fabric; a cufflink weighs a few grams. Yet
              they are what people remember about how you dressed. We obsess
              over these small things — the weight of a knot, the snap of a
              clasp, the sheen of a kundan stone — so the finishing touch is
              never an afterthought.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Designed in India, for Indian occasions: the sangeet and the
              interview, the convocation and the boardroom.
            </p>
          </div>

          {/* pillars */}
          <div className="grid gap-8 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, text }) => (
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
      </div>
    </section>
  );
}
