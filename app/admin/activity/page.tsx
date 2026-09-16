import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import {
  abbreviatedActor,
  adminActivityLabel,
  describeAdminActivity,
  formatAdminActivityTime,
  isAdminActivityAction,
  type AdminActivityRow,
} from "@/lib/admin-activity";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Activity",
};

const PAGE_SIZE = 50;

interface RawActivityRow {
  id: number;
  occurred_at: string;
  actor_id: string;
  action: string;
  target_ids: string[] | null;
  metadata: Record<string, unknown> | null;
}

function toActivity(row: RawActivityRow): AdminActivityRow | null {
  if (!isAdminActivityAction(row.action) || !Array.isArray(row.target_ids)) {
    return null;
  }
  return {
    id: row.id,
    occurred_at: row.occurred_at,
    actor_id: row.actor_id,
    action: row.action,
    target_ids: row.target_ids,
    metadata: row.metadata,
  };
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if (isDemoMode) return null;
  await requireAdmin();

  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const from = (page - 1) * PAGE_SIZE;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("admin_activity")
    .select("id, occurred_at, actor_id, action, target_ids, metadata", {
      count: "exact",
    })
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const activities = ((data ?? []) as RawActivityRow[])
    .map(toActivity)
    .filter((activity): activity is AdminActivityRow => activity !== null);
  const total = count ?? activities.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Admin activity</h2>
        <p className="mt-1 text-sm text-muted">
          {error ? "History is temporarily unavailable" : `${total} immutable event${total === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="border border-gold-light/50 bg-card px-4 py-3 text-sm text-muted">
        Duplicate, archive, bulk state, featured, and category operations are
        recorded in the same database transaction. Entries cannot be edited or
        deleted from the application.
      </div>

      {error ? (
        <p
          role="alert"
          className="border border-danger/50 bg-card px-4 py-3 text-sm text-danger"
        >
          Could not load admin activity. Confirm migration 009 is applied, then
          refresh this page.
        </p>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={<History size={32} strokeWidth={1.5} />}
          title={page > 1 ? "No activity on this page" : "No admin activity yet"}
          description={
            page > 1
              ? "Return to an earlier page to continue browsing history."
              : "Safe duplicate, archive, state, featured, and category operations will appear here."
          }
          actionLabel={page > 1 ? "Back to first page" : undefined}
          actionHref={page > 1 ? "/admin/activity" : undefined}
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Targets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {activities.map((activity) => (
                <tr key={activity.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-4 text-muted">
                    <time dateTime={activity.occurred_at}>
                      {formatAdminActivityTime(activity.occurred_at)}
                    </time>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted">
                    {abbreviatedActor(activity.actor_id)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-ivory">
                      {adminActivityLabel(activity.action)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {describeAdminActivity(activity)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted">
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      {activity.target_ids.slice(0, 3).map((id) => (
                        <Link
                          key={id}
                          href={`/admin/products/${id}`}
                          className="font-mono transition-colors hover:text-gold"
                        >
                          {id.slice(0, 8)}
                        </Link>
                      ))}
                      {activity.target_ids.length > 3 && (
                        <span>+{activity.target_ids.length - 3} more</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && totalPages > 1 && (
        <nav aria-label="Activity pagination" className="flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={page === 2 ? "/admin/activity" : `/admin/activity?page=${page - 1}`}
              className="border border-line px-4 py-2 text-xs uppercase tracking-widest text-muted transition-colors hover:border-gold-light hover:text-ivory"
            >
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/activity?page=${page + 1}`}
              className="border border-line px-4 py-2 text-xs uppercase tracking-widest text-muted transition-colors hover:border-gold-light hover:text-ivory"
            >
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
