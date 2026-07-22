import type { Metadata } from "next";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { CouponForm } from "@/components/admin/CouponForm";

export const metadata: Metadata = {
  title: "New Coupon",
};

export default async function AdminNewCouponPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">New Coupon</h2>
        <p className="mt-1 text-sm text-muted">
          Amounts are entered in rupees and stored as paise.
        </p>
      </div>
      <CouponForm />
    </div>
  );
}
