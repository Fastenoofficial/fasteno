import Link from "next/link";
import { getAnnouncementSetting } from "@/lib/settings";

/** Slim admin-editable announcement bar mounted above the TrustBar.
 *  Server component — reads the 'announcement' site setting and renders
 *  nothing unless it is enabled with text. */
export async function AnnouncementBar() {
  const { enabled, text, href } = await getAnnouncementSetting();
  if (!enabled || !text) return null;

  const content = (
    <span className="text-[11px] font-medium uppercase tracking-[0.14em]">
      {text}
    </span>
  );

  return (
    <div className="border-b border-white/10 bg-keynote text-block-text">
      <div className="mx-auto flex max-w-[90rem] items-center justify-center px-4 py-2 text-center sm:px-6 lg:px-8">
        {href ? (
          <Link
            href={href}
            className="rounded-sm transition-colors hover:text-gold-light"
          >
            {content}
            <span aria-hidden="true" className="ml-2 text-gold-light">
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
