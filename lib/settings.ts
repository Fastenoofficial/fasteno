import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/config";

/** Site-settings data layer (SERVER ONLY — server components, route
 *  handlers, server actions). Reads the `site_settings` key/value jsonb
 *  table (public-read RLS); demo mode returns the same defaults that
 *  migration 003 seeds. Reads are memoised per request via React cache().
 *  Never throws — a broken row falls back to the defaults. */

export interface AnnouncementSetting {
  enabled: boolean;
  text: string;
  href: string;
}

export interface DeliverySetting {
  /** Orders leave the warehouse within this many hours. */
  dispatchHours: number;
  /** Delivery window in days (inclusive), counted from order day. */
  minDays: number;
  maxDays: number;
}

/** Seasonal merchandising band on the homepage (Rakhi, Diwali, weddings). */
export interface FestiveSetting {
  enabled: boolean;
  eyebrow: string;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
}

interface SettingsMap {
  announcement: AnnouncementSetting;
  delivery: DeliverySetting;
  festive: FestiveSetting;
}

export type SettingKey = keyof SettingsMap;

/** announcement/delivery mirror the rows seeded by migration 003; festive
 *  defaults ship in code (upserted on first admin save). */
const DEFAULTS: SettingsMap = {
  announcement: { enabled: false, text: "", href: "" },
  delivery: { dispatchHours: 24, minDays: 3, maxDays: 7 },
  festive: {
    enabled: true,
    eyebrow: "Raksha Bandhan · 28 August",
    title: "A gift he'll actually keep.",
    text: "Rakhi gifting, solved — coordinated gift sets, cufflinks and pocket squares in a rigid gift box, ready to give the moment they arrive.",
    ctaLabel: "Shop Rakhi Gifts",
    ctaHref: "/shop?tag=gift",
  },
};

// ── Raw per-request-cached row read ───────────────────────────────────

const readSettingRow = cache(
  async (key: string): Promise<Record<string, unknown> | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      // Cookie-less anon client: settings are public-read, and using the
      // cookie-bound SSR client here would force every page that renders
      // the announcement bar (i.e. all of them, via the layout) to be
      // dynamically rendered.
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error || !data?.value || typeof data.value !== "object") return null;
      return data.value as Record<string, unknown>;
    } catch (err) {
      console.error(`settings: read "${key}" failed —`, err);
      return null;
    }
  },
);

// ── Value coercion (jsonb is untyped — normalise defensively) ─────────

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function toStr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function normalise<K extends SettingKey>(
  key: K,
  raw: Record<string, unknown>,
): SettingsMap[K] {
  if (key === "announcement") {
    const d = DEFAULTS.announcement;
    const value: AnnouncementSetting = {
      enabled: raw.enabled === true,
      text: toStr(raw.text, d.text),
      href: toStr(raw.href, d.href),
    };
    return value as SettingsMap[K];
  }
  if (key === "festive") {
    const d = DEFAULTS.festive;
    const value: FestiveSetting = {
      enabled: raw.enabled === true,
      eyebrow: toStr(raw.eyebrow, d.eyebrow),
      title: toStr(raw.title, d.title),
      text: toStr(raw.text, d.text),
      ctaLabel: toStr(raw.ctaLabel, d.ctaLabel),
      ctaHref: toStr(raw.ctaHref, d.ctaHref),
    };
    return value as SettingsMap[K];
  }
  const d = DEFAULTS.delivery;
  const minDays = toInt(raw.minDays, d.minDays);
  const value: DeliverySetting = {
    dispatchHours: toInt(raw.dispatchHours, d.dispatchHours),
    minDays,
    maxDays: Math.max(minDays, toInt(raw.maxDays, d.maxDays)),
  };
  return value as SettingsMap[K];
}

// ── Public API ────────────────────────────────────────────────────────

/** Typed setting fetch with demo-mode / failure fallback to defaults. */
export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingsMap[K]> {
  const raw = await readSettingRow(key);
  if (!raw) return DEFAULTS[key];
  return normalise(key, raw);
}

export function getAnnouncementSetting(): Promise<AnnouncementSetting> {
  return getSetting("announcement");
}

export function getDeliverySetting(): Promise<DeliverySetting> {
  return getSetting("delivery");
}

export function getFestiveSetting(): Promise<FestiveSetting> {
  return getSetting("festive");
}
