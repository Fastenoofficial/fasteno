"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { getProfile } from "@/lib/auth";

/** Server actions for /admin/settings (site_settings table).
 *  Self-contained admin re-check — deliberately does NOT import from
 *  components/admin/actions.ts (owned by another feature area); the
 *  assertAdmin pattern is copied. RLS enforces admin writes in the DB
 *  regardless. */

async function assertAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured) return "Admin is disabled in demo mode.";
  const profile = await getProfile();
  if (!profile || profile.role !== "admin")
    return "You need admin access for this.";
  return null;
}

const back = (params: string): never => redirect(`/admin/settings?${params}`);
const fail = (message: string): never =>
  back(`error=${encodeURIComponent(message)}`);

function formInt(
  formData: FormData,
  name: string,
  label: string,
  min: number,
  max: number,
): number {
  const raw = String(formData.get(name) ?? "").trim();
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n < min || n > max) {
    fail(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

/** Upserts the 'announcement' and 'delivery' site_settings rows from the
 *  settings form. Used as a <form action> — reports back via query params. */
export async function saveSiteSettings(formData: FormData): Promise<void> {
  const denied = await assertAdmin();
  if (denied) fail(denied);

  // ── Announcement bar ────────────────────────────────────────────────
  const enabled = formData.get("announcementEnabled") === "on";
  const text = String(formData.get("announcementText") ?? "").trim();
  const href = String(formData.get("announcementHref") ?? "").trim();

  if (enabled && !text) {
    fail("Announcement text is required when the bar is enabled.");
  }
  if (text.length > 160) {
    fail("Announcement text must be 160 characters or fewer.");
  }
  if (href && !/^(\/|https?:\/\/)/i.test(href)) {
    fail("Announcement link must start with / or http(s)://.");
  }

  // ── Delivery promise ────────────────────────────────────────────────
  const dispatchHours = formInt(
    formData,
    "dispatchHours",
    "Dispatch window (hours)",
    1,
    168,
  );
  const minDays = formInt(formData, "minDays", "Minimum delivery days", 1, 60);
  const maxDays = formInt(formData, "maxDays", "Maximum delivery days", 1, 90);
  if (maxDays < minDays) {
    fail("Maximum delivery days cannot be less than the minimum.");
  }

  const updatedAt = new Date().toISOString();
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert(
    [
      {
        key: "announcement",
        value: { enabled, text, href },
        updated_at: updatedAt,
      },
      {
        key: "delivery",
        value: { dispatchHours, minDays, maxDays },
        updated_at: updatedAt,
      },
    ],
    { onConflict: "key" },
  );
  if (error) {
    console.error("settings: upsert failed —", error.message);
    fail("Could not save the settings. Please try again.");
  }

  // Announcement bar + delivery estimates render site-wide.
  revalidatePath("/", "layout");
  back("saved=1");
}
