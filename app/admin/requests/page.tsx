import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  RequestRow,
  type AdminRequest,
} from "@/components/admin/RequestRow";

export const metadata: Metadata = {
  title: "Requests",
};

/** Cancel / return / replace requests raised from the account area.
 *  Requested rows → Approve / Reject; approved rows → Complete (return
 *  completes with a refund via refundOrder, replace is bookkeeping only). */

interface RequestQueryRow {
  id: string;
  order_id: string;
  type: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  orders: { order_number: string; email: string } | null;
}

function formatAge(iso: string, now: number): string {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function AdminRequestsPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_requests")
    .select(
      "id, order_id, type, reason, status, admin_note, created_at, resolved_at, orders(order_number, email)",
    )
    .order("created_at", { ascending: false });

  const now = Date.now();
  const rows = (data ?? []) as unknown as RequestQueryRow[];
  const requests: AdminRequest[] = rows.map((r) => ({
    id: r.id,
    orderId: r.order_id,
    orderNumber: r.orders?.order_number ?? "—",
    email: r.orders?.email ?? "—",
    type: r.type as AdminRequest["type"],
    reason: r.reason,
    status: r.status as AdminRequest["status"],
    adminNote: r.admin_note,
    createdAt: r.created_at,
    age: formatAge(r.created_at, now),
    resolvedAt: r.resolved_at,
  }));

  const open = requests.filter(
    (r) => r.status === "requested" || r.status === "approved",
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Requests</h2>
        <p className="mt-1 text-sm text-muted">
          {requests.length} total · {open} open
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={<Inbox size={32} strokeWidth={1.5} />}
          title="No requests yet"
          description="Cancellations, returns and replacements raised by customers will appear here."
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
