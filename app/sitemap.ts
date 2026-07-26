import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { SITE_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({}),
  ]);

  const staticPaths = [
    "",
    "/shop",
    "/about",
    "/contact",
    "/faq",
    "/guides",
    "/guides/how-to-tie-a-tie",
    "/guides/tie-size",
    "/guides/silk-care",
    "/guides/cufflink-guide",
    "/shipping-returns",
    "/payments",
    "/track-order",
    "/privacy",
    "/terms",
  ];

  return [
    ...staticPaths.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: (path === "" || path === "/shop"
        ? "daily"
        : "monthly") as "daily" | "monthly",
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.4,
    })),
    ...categories.map((c) => ({
      url: `${SITE_URL}/shop/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
