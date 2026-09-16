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

/** Brand-story band — the craftsmanship promise behind Fasteno. */
export function CraftsmanshipBand() {
  return (
    <section className="on-dark relative overflow-hidden border-y border-white/10 bg-block text-block-text">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-gold-light/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-[90rem] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
          {/* story */}
          <div>
            <p className="eyebrow mb-3">The Fasteno standard</p>
            <h2 className="font-display text-3xl font-semibold leading-snug tracking-[-0.035em] text-block-text md:text-4xl">
              Small things, taken seriously.
            </h2>
            <div className="gold-rule mt-4" />
            <p className="mt-5 text-sm leading-relaxed text-block-text/68">
              A tie is a metre of fabric; a cufflink weighs a few grams. Yet
              they are what people remember about how you dressed. We obsess
              over these small things — the weight of a knot, the snap of a
              clasp, the sheen of a kundan stone — so the finishing touch is
              never an afterthought.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-block-text/68">
              Designed in India, for Indian occasions: the sangeet and the
              interview, the convocation and the boardroom.
            </p>
          </div>

          {/* pillars */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm sm:p-6"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-light/30 bg-gold-light/10 text-gold-light">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-block-text">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-block-text/62">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
