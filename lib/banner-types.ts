/** Shared banner contracts. Database rows stay snake_case; client slides are
 * plain serializable values with no Date, Supabase, or React instances. */

export const BANNER_LOCATIONS = [
  "home-hero",
  "category-header",
  "promo-bar",
] as const;

export type BannerLocation = (typeof BANNER_LOCATIONS)[number];
export const HERO_BANNER_LOCATION: BannerLocation = "home-hero";

export const BANNER_FIELD_LIMITS = {
  title: 120,
  subtitle: 500,
  ctaText: 80,
  url: 2_048,
  sortOrder: 2_147_483_647,
} as const;

export function isBannerLocation(value: unknown): value is BannerLocation {
  return (
    typeof value === "string" &&
    (BANNER_LOCATIONS as readonly string[]).includes(value)
  );
}

/** The nullable shape reflects the existing table, whose defaulted columns
 * were not originally declared NOT NULL. */
export interface SiteBannerRow {
  id: string;
  location: BannerLocation;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string;
  mobile_image_url: string | null;
  enabled: boolean | null;
  sort_order: number | null;
  product_1_id: string | null;
  product_2_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
}

export interface BannerProductOption {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  active: boolean;
}

export interface BannerProductCallout {
  slot: 1 | 2;
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
}

export interface HeroSlideCta {
  text: string;
  href: string;
}

export interface HeroSlideAccentImage {
  src: string;
  alt: string;
}

export interface HeroCarouselSlide {
  id: string;
  source: "fallback" | "cms";
  eyebrow: string | null;
  title: string;
  subtitle: string;
  cta: HeroSlideCta | null;
  desktopImage: string;
  mobileImage: string | null;
  imageAlt: string;
  accentImage: HeroSlideAccentImage | null;
  accentLabel: string | null;
  productCallouts: BannerProductCallout[];
}

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const DATE_TIME_LOCAL =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Parse an explicitly IST-labelled datetime-local value into a UTC ISO
 * instant. Returns null for empty, malformed, or impossible calendar values. */
export function parseIstDateTimeLocal(value: string): string | null {
  const match = DATE_TIME_LOCAL.exec(value.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 1000 || month < 1 || month > 12 || hour > 23 || minute > 59) {
    return null;
  }

  const localClock = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    localClock.getUTCFullYear() !== year ||
    localClock.getUTCMonth() !== month - 1 ||
    localClock.getUTCDate() !== day ||
    localClock.getUTCHours() !== hour ||
    localClock.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return new Date(
    localClock.getTime() - IST_OFFSET_MINUTES * 60_000,
  ).toISOString();
}

/** Format a stored instant for an IST-labelled datetime-local input. */
export function formatIsoAsIstDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "";
  return new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000)
    .toISOString()
    .slice(0, 16);
}
