import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { WishlistGrid } from "@/components/account/WishlistGrid";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you have saved for later.",
};

/** Works in BOTH modes — ids live in localStorage (useCart), resolved
 *  against the catalog via a server action. */
export default function WishlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Wishlist</h2>
        <p className="mt-1 text-sm text-muted">
          {isDemoMode
            ? "Saved in this browser — no account needed."
            : "Saved in this browser, ready when you are."}
        </p>
      </div>
      <WishlistGrid />
    </div>
  );
}
