import type { Metadata } from "next";
import type { ReactNode } from "react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { AdminNav } from "@/components/admin/AdminNav";
import { DemoNotice } from "@/components/account/DemoNotice";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin | Fasteno Shyama",
  },
  robots: { index: false, follow: false },
};

/** Admin shell. Gated by requireAdmin (middleware already ensures a
 *  session exists; this adds the role check). Demo mode → notice. */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (isDemoMode) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <DemoNotice
          title="The admin panel is disabled in demo mode"
          description="Product management, order management and dashboard stats need a connected Supabase project with an admin user (profiles.role = 'admin')."
        />
      </section>
    );
  }

  await requireAdmin();

  // Pending-work counts for the nav badges (head-only count queries).
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const [pendingOrders, pendingReviews, openRequests] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed"]),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("order_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Back of house</p>
          <h1 className="font-display text-4xl text-ivory">Admin</h1>
          <div className="gold-rule mt-4" />
        </div>
        <Badge tone="gold">Store manager</Badge>
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AdminNav
          counts={{
            orders: pendingOrders.count ?? 0,
            reviews: pendingReviews.count ?? 0,
            requests: openRequests.count ?? 0,
          }}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
