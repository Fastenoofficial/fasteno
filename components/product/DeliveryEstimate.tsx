import { getDeliverySetting } from "@/lib/settings";

/** Server component: dispatch + delivery promise with a computed arrival
 *  date range, driven by the admin-editable 'delivery' site setting.
 *  e.g. "Dispatched within 24 hours · Delivery in 3–7 days · Arrives
 *  20 – 24 Jul". No props — reads the setting itself. */

const monthDay = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const dayOnly = new Intl.DateTimeFormat("en-IN", { day: "numeric" });

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatRange(from: Date, to: Date): string {
  if (from.getTime() === to.getTime()) return monthDay.format(from);
  const sameMonth =
    from.getMonth() === to.getMonth() &&
    from.getFullYear() === to.getFullYear();
  const first = sameMonth ? dayOnly.format(from) : monthDay.format(from);
  return `${first} – ${monthDay.format(to)}`;
}

export async function DeliveryEstimate() {
  const { dispatchHours, minDays, maxDays } = await getDeliverySetting();

  const now = new Date();
  const arrives = formatRange(addDays(now, minDays), addDays(now, maxDays));
  const window =
    minDays === maxDays ? `${minDays}` : `${minDays}–${maxDays}`;

  return (
    <p className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
      {/* truck glyph — thin functional stroke per Modern Heritage */}
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-gold"
      >
        <path d="M14 16H2V6h12v10Z" />
        <path d="M14 9h4l3 3.5V16h-7" />
        <circle cx="6.5" cy="17.75" r="1.75" />
        <circle cx="16.5" cy="17.75" r="1.75" />
      </svg>
      <span>
        Dispatched within {dispatchHours} hours · Delivery in {window} days
        <span className="mt-0.5 block text-ivory">Arrives {arrives}</span>
      </span>
    </p>
  );
}
