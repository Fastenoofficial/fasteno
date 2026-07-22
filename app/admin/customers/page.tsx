import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Customers",
};

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

interface CustomerListEntry {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joined: string;
  orderCount: number;
  /** paise, excluding cancelled orders */
  lifetimeValue: number;
}

/** Emails live in auth.users — fetched via the service-role admin API when
 *  SUPABASE_SERVICE_ROLE_KEY is set; otherwise recovered from each
 *  customer's most recent order. */
async function getAuthEmails(): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  const service = createServiceClient();
  if (!service) return emails;

  const PER_PAGE = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (u.email) emails.set(u.id, u.email);
    if (data.users.length < PER_PAGE) break;
  }
  return emails;
}

export default async function AdminCustomersPage() {
  if (isDemoMode) return null; // layout renders the demo notice
  await requireAdmin();

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const [profilesRes, ordersRes, authEmails] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("user_id, email, total, status, created_at")
      .not("user_id", "is", null)
      .order("created_at", { ascending: false }),
    getAuthEmails(),
  ]);

  const orderStats = new Map<
    string,
    { count: number; value: number; email: string }
  >();
  for (const o of ordersRes.data ?? []) {
    if (!o.user_id) continue;
    const stat = orderStats.get(o.user_id) ?? { count: 0, value: 0, email: "" };
    stat.count += 1;
    if (o.status !== "cancelled") stat.value += o.total ?? 0;
    if (!stat.email && o.email) stat.email = o.email; // newest first
    orderStats.set(o.user_id, stat);
  }

  const customers: CustomerListEntry[] = (
    (profilesRes.data ?? []) as ProfileRow[]
  ).map((p) => {
    const stat = orderStats.get(p.id);
    return {
      id: p.id,
      name: p.full_name?.trim() || "—",
      email: authEmails.get(p.id) ?? stat?.email ?? "—",
      phone: p.phone?.trim() || "—",
      role: p.role,
      joined: p.created_at,
      orderCount: stat?.count ?? 0,
      lifetimeValue: stat?.value ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-ivory">Customers</h2>
        <p className="mt-1 text-sm text-muted">
          {customers.length} registered {customers.length === 1 ? "account" : "accounts"}
        </p>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users size={32} strokeWidth={1.5} />}
          title="No customers yet"
          description="Accounts created on the storefront will appear here."
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Orders</th>
                <th className="px-4 py-3 text-right font-medium">
                  Lifetime value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="flex items-center gap-2 text-ivory transition-colors hover:text-gold"
                    >
                      {c.name}
                      {c.role === "admin" && <Badge tone="gold">Admin</Badge>}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted">
                    {c.email}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.phone}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(c.joined)}
                  </td>
                  <td className="px-4 py-3 text-right text-ivory">
                    {c.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right font-display text-ivory">
                    {formatINR(c.lifetimeValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
