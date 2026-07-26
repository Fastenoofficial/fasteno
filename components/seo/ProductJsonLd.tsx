import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/config";
import type { Product } from "@/lib/types";
import type { Review } from "@/components/reviews/data";

const absolute = (path: string): string =>
  path.startsWith("http") ? path : `${SITE_URL}${path}`;

/** Product + Offer JSON-LD for the product detail page.
 *  Prices are stored in paise — schema.org wants a decimal rupee value.
 *  `rating` (approved-review aggregate) is fetched once by the PDP and
 *  shared with the on-page reviews header; only emitted when count > 0.
 *  `reviews` (approved only) become Review items for Product snippets.
 *
 *  shippingDetails / hasMerchantReturnPolicy mirror the published policy on
 *  /shipping-returns — if that page changes, change this too:
 *  free shipping at/over FREE_SHIPPING_THRESHOLD else SHIPPING_FEE, dispatch
 *  1–2 business days, transit 2–7 business days, 7-day returns from delivery
 *  with return shipping borne by the customer, full refund. */
export function ProductJsonLd({
  product,
  rating,
  reviews,
}: {
  product: Product;
  rating?: { count: number; average: number };
  reviews?: Review[];
}) {
  const approved = (reviews ?? []).filter((r) => r.status === "approved");

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
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          // Rate for buying this product on its own — the same rule the
          // cart applies to its total.
          value:
            product.price >= FREE_SHIPPING_THRESHOLD
              ? "0.00"
              : (SHIPPING_FEE / 100).toFixed(2),
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 7,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
        refundType: "https://schema.org/FullRefund",
      },
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
    ...(approved.length > 0
      ? {
          review: approved.slice(0, 10).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.authorName },
            datePublished: r.createdAt.slice(0, 10),
            name: r.title,
            reviewBody: r.body,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: "5",
              worstRating: "1",
            },
          })),
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
