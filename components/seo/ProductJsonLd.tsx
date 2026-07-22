import { SITE_NAME, SITE_URL } from "@/lib/config";
import type { Product } from "@/lib/types";

const absolute = (path: string): string =>
  path.startsWith("http") ? path : `${SITE_URL}${path}`;

/** Product + Offer JSON-LD for the product detail page.
 *  Prices are stored in paise — schema.org wants a decimal rupee value.
 *  `rating` (approved-review aggregate) is fetched once by the PDP and
 *  shared with the on-page reviews header; only emitted when count > 0. */
export function ProductJsonLd({
  product,
  rating,
}: {
  product: Product;
  rating?: { count: number; average: number };
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map(absolute),
    description: product.description,
    sku: product.slug,
    brand: { "@type": "Brand", name: SITE_NAME },
    countryOfOrigin: { "@type": "Country", name: "India" },
    material: product.material,
    color: product.color,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
