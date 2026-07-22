import { BadgeCheck, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { formatINR } from "@/lib/format";

const items = [
  {
    icon: Truck,
    text: `Free shipping over ${formatINR(FREE_SHIPPING_THRESHOLD)}`,
  },
  { icon: BadgeCheck, text: "Cash on Delivery available" },
  { icon: RefreshCcw, text: "7-day easy returns" },
  { icon: ShieldCheck, text: "Secure payments via Razorpay" },
];

/** Slim reassurance strip shown under the navbar site-wide. */
export function TrustBar() {
  return (
    <div className="border-b border-line bg-block text-block-text">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 overflow-x-auto px-4 py-2.5 sm:px-6">
        {items.map(({ icon: Icon, text }) => (
          <span
            key={text}
            className="flex shrink-0 items-center gap-2 text-[11px] tracking-wide text-block-text/85"
          >
            <Icon size={13} className="text-gold-light" />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
