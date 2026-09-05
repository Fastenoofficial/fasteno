import Link from "next/link";
import type { Category } from "@/lib/types";

/** Representative artwork per category, drawn from the generated catalogue SVGs. */
const categoryArt: Record<string, string> = {
  ties: "/products/burgundy-repp-stripe-tie.svg",
  cufflinks: "/products/mother-of-pearl-round-cufflinks.svg",
  brooches: "/products/kundan-peacock-brooch.svg",
  "pocket-squares": "/products/burgundy-paisley-pocket-square.svg",
  buttons: "/products/golden-brass-blazer-buttons.svg",
  "gift-sets": "/products/the-monarch-gift-set.svg",
};

/** Six-tile category grid linking into the shop. Server component. */
export function CategoryTiles({ categories }: { categories: Category[] }) {
  // Filter to only display categories marked for home page display
  const displayCategories = categories.filter((cat) => cat.display_on_home !== false);

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
      {displayCategories.map((category) => (
        <Link
          key={category.slug}
          href={`/shop/${category.slug}`}
          className="lift group relative block overflow-hidden border border-line bg-card"
        >
          <div className="aspect-[4/3] overflow-hidden bg-surface">
            <img
              src={category.image_url || categoryArt[category.slug] || `/products/${category.slug}.svg`}
              alt={category.name}
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.05]"
            />
          </div>
          {/* caption band */}
          <div className="border-t border-line bg-ink/85 p-4 backdrop-blur-sm sm:p-5">
            <h3 className="font-display text-lg text-ivory transition-colors group-hover:text-gold sm:text-xl">
              {category.name}
            </h3>
            <p className="mt-1 hidden text-xs leading-relaxed text-muted sm:block">
              {category.description}
            </p>
            <p className="eyebrow mt-3">Shop {category.name} →</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
