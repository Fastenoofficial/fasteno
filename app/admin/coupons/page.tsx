import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CouponRowActions } from "@/components/admin/CouponRowActions";

export const metadata: Metadata = {
  title: "Coupons",
};

interface CouponRow {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  created_at: string;
}

function couponValue(c: CouponRow): string {
  return c.type === "percent" ? `${c.value}% off` : `${formatINR(c.value)} off`;
}

export default async function AdminCouponsPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, min_subtotal, max_discount, active, expires_at, usage_limit, used_count, created_at",
    )
    .order("created_at", { ascending: false });

  const coupons = (data ?? []) as CouponRow[];
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Coupons</h2>
          <p className="mt-1 text-sm text-muted">
            {coupons.length} code{coupons.length === 1 ? "" : "s"} — applied at
            checkout against the order subtotal
          </p>
        </div>
        <Button href="/admin/coupons/new" variant="primary" size="sm">
          New Coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={<Ticket size={32} strokeWidth={1.5} />}
          title="No coupons yet"
          description="Create a discount code to run your first promotion."
          actionLabel="Create Coupon"
          actionHref="/admin/coupons/new"
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Min order</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => {
                const expired =
                  c.expires_at !== null && Date.parse(c.expires_at) < now;
                const exhausted =
                  c.usage_limit !== null && c.used_count >= c.usage_limit;
                return (
                  <tr key={c.id} className="transition-colors hover:bg-surface">
                    <td className="px-4 py-3">
                      <span className="font-semibold tracking-wider text-ivory">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {couponValue(c)}
                      {c.type === "percent" && c.max_discount !== null && (
                        <span className="block text-xs text-muted/80">
                          up to {formatINR(c.max_discount)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {c.min_subtotal > 0 ? formatINR(c.min_subtotal) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {c.used_count}
                      {c.usage_limit !== null ? ` / ${c.usage_limit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {c.expires_at ? formatDate(c.expires_at) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      {!c.active ? (
                        <Badge tone="muted">Inactive</Badge>
                      ) : expired ? (
                        <Badge tone="danger">Expired</Badge>
                      ) : exhausted ? (
                        <Badge tone="danger">Exhausted</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CouponRowActions couponId={c.id} active={c.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
