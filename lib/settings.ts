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

interface SettingsMap {
  announcement: AnnouncementSetting;
  delivery: DeliverySetting;
}

export type SettingKey = keyof SettingsMap;

/** Mirrors the rows seeded by supabase/migrations/003_reviews_requests.sql. */
const DEFAULTS: SettingsMap = {
  announcement: { enabled: false, text: "", href: "" },
  delivery: { dispatchHours: 24, minDays: 3, maxDays: 7 },
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
