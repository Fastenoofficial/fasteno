import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface DemoNoticeProps {
  title: string;
  description: string;
  /** Show a link to the wishlist (which works even in demo mode). */
  showWishlistLink?: boolean;
}

/** Friendly "this feature needs Supabase" card shown across auth, account
 *  and admin areas when the site runs in demo mode. */
export function DemoNotice({
  title,
  description,
  showWishlistLink = false,
}: DemoNoticeProps) {
  return (
    <div className="flex flex-col items-center border border-line bg-card px-6 py-16 text-center">
      <Badge tone="gold">Demo mode</Badge>
      <h2 className="mt-5 font-display text-3xl text-ivory">{title}</h2>
      <div className="gold-rule mx-auto mt-4" />
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      <p className="mt-3 max-w-md text-xs leading-relaxed text-muted/80">
        To enable accounts, connect a Supabase project by setting{" "}
        <code className="text-gold">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-gold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/shop" variant="primary" size="md">
          Continue Shopping
        </Button>
        {showWishlistLink && (
          <Button href="/account/wishlist" variant="outline" size="md">
            View Wishlist
          </Button>
        )}
      </div>
    </div>
  );
}
