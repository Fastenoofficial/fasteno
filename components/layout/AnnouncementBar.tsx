import Link from "next/link";
import { getAnnouncementSetting } from "@/lib/settings";

/** Slim admin-editable announcement bar mounted above the TrustBar.
 *  Server component — reads the 'announcement' site setting and renders
 *  nothing unless it is enabled with text. A gold-tinted ivory band keeps
 *  it distinct from the charcoal TrustBar below it (gold used sparingly,
 *  per Modern Heritage). */
export async function AnnouncementBar() {
  const { enabled, text, href } = await getAnnouncementSetting();
  if (!enabled || !text) return null;

  const content = (
    <span className="text-[11px] font-medium tracking-[0.14em] uppercase">
      {text}
    </span>
  );

  return (
    <div className="border-b border-line bg-gold-light/20 text-ivory">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center sm:px-6">
        {href ? (
          <Link
            href={href}
            className="transition-colors hover:text-gold"
          >
            {content}
            <span aria-hidden="true" className="ml-2 text-gold">
              →
            </span>
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
