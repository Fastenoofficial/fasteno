import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import {
  getAnnouncementSetting,
  getDeliverySetting,
} from "@/lib/settings";
import { saveSiteSettings } from "@/components/admin/settings-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export const metadata: Metadata = {
  title: "Site Settings",
};

export const dynamic = "force-dynamic";

/** Admin editor for the site_settings table: announcement bar +
 *  delivery promise. Demo mode is handled by the admin layout (it renders
 *  the demo notice instead of children). */
export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const [{ saved, error }, announcement, delivery] = await Promise.all([
    searchParams,
    getAnnouncementSetting(),
    getDeliverySetting(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Site settings</h2>
        <p className="mt-1 text-sm text-muted">
          Announcement bar and the delivery promise shown on product, cart
          and checkout pages.
        </p>
      </div>

      {saved && (
        <p className="border border-success/50 bg-card px-4 py-3 text-sm text-success">
          Settings saved. The storefront reflects them immediately.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <form action={saveSiteSettings} className="space-y-6">
        {/* ── Announcement bar ── */}
        <div className="space-y-4 border border-line bg-card p-6">
          <h3 className="font-display text-lg text-ivory">Announcement bar</h3>
          <p className="text-xs text-muted">
            A slim band above the trust strip on every page — use it for
            festive promotions or shipping notices.
          </p>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory">
            <input
              type="checkbox"
              name="announcementEnabled"
              defaultChecked={announcement.enabled}
              className="h-4 w-4 cursor-pointer accent-block"
            />
            Show the announcement bar
          </label>
          <Input
            label="Text"
            name="announcementText"
            defaultValue={announcement.text}
            placeholder="Festive dispatch: order by 20 Dec for delivery before New Year"
            maxLength={160}
          />
          <Input
            label="Link (optional)"
            name="announcementHref"
            defaultValue={announcement.href}
            placeholder="/shop?tag=festive"
          />
        </div>

        {/* ── Delivery promise ── */}
        <div className="space-y-4 border border-line bg-card p-6">
          <h3 className="font-display text-lg text-ivory">Delivery promise</h3>
          <p className="text-xs text-muted">
            Drives the &ldquo;Dispatched within X hours · Delivery in
            X–Y days&rdquo; estimate and its computed arrival dates.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Dispatch within (hours)"
              name="dispatchHours"
              inputMode="numeric"
              defaultValue={String(delivery.dispatchHours)}
              placeholder="24"
              required
            />
            <Input
              label="Delivery min (days)"
              name="minDays"
              inputMode="numeric"
              defaultValue={String(delivery.minDays)}
              placeholder="3"
              required
            />
            <Input
              label="Delivery max (days)"
              name="maxDays"
              inputMode="numeric"
              defaultValue={String(delivery.maxDays)}
              placeholder="7"
              required
            />
          </div>
        </div>

        <Button type="submit" variant="primary" size="md">
          Save Settings
        </Button>
      </form>
    </div>
  );
}
