import type { Metadata } from "next";
import { Download, Images, ShieldCheck } from "lucide-react";
import { isDemoMode } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminMediaInventory,
  type MediaInventoryRow,
  type MediaInventoryStatus,
} from "@/lib/admin-media-inventory";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Media inventory",
};

export const dynamic = "force-dynamic";

const DISPLAY_LIMIT = 250;

const STATUS_LABELS: Record<MediaInventoryStatus, string> = {
  referenced: "Referenced",
  unreferenced: "Unreferenced",
  missing: "Missing object",
  external: "External",
  local: "Local",
  invalid: "Invalid reference",
};

function statusTone(
  status: MediaInventoryStatus,
): "gold" | "muted" | "success" | "danger" {
  if (status === "referenced") return "success";
  if (status === "missing" || status === "invalid") return "danger";
  if (status === "unreferenced") return "gold";
  return "muted";
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceSummary(row: MediaInventoryRow): string {
  if (row.referenceCount === 0) return "No database references";
  const preview = row.sources.slice(0, 3).join(" · ");
  const remaining = row.sources.length - 3;
  return remaining > 0 ? `${preview} · +${remaining} more` : preview;
}

export default async function AdminMediaPage() {
  if (isDemoMode) return null;
  await requireAdmin();

  let report: Awaited<ReturnType<typeof getAdminMediaInventory>> | null = null;
  try {
    report = await getAdminMediaInventory();
  } catch (error) {
    console.error(
      "admin media inventory failed —",
      error instanceof Error ? error.message : error,
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl text-ivory">Media inventory</h2>
          <p className="mt-1 text-sm text-muted">Read-only storage safety report</p>
        </div>
        <EmptyState
          icon={<Images size={32} strokeWidth={1.5} />}
          title="Media report unavailable"
          description="Confirm the server-only service role key and Storage access, then refresh. No files were changed."
        />
      </div>
    );
  }

  const summaryCards = [
    ["Storage objects", report.summary.storageObjects],
    ["Referenced", report.summary.referencedObjects],
    ["Unreferenced", report.summary.unreferencedObjects],
    ["Missing", report.summary.missingObjects],
    ["External URLs", report.summary.externalValues],
    ["Local paths", report.summary.localValues],
    ["Invalid", report.summary.invalidValues],
    ["Reference uses", report.summary.totalReferences],
  ] as const;
  const displayedRows = report.rows.slice(0, DISPLAY_LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-ivory">Media inventory</h2>
          <p className="mt-1 text-sm text-muted">
            Complete bucket and database-reference report · generated{" "}
            <time dateTime={report.generatedAt}>
              {new Date(report.generatedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
              })}
            </time>
          </p>
        </div>
        <a
          href="/api/admin/export/media"
          className="inline-flex items-center gap-2 border border-gold-light px-4 py-2 text-xs font-medium uppercase tracking-[0.05em] text-ivory transition-colors hover:bg-surface"
        >
          <Download size={14} />
          Export full CSV
        </a>
      </div>

      <div className="flex gap-3 border border-gold-light/50 bg-card px-4 py-3 text-sm text-muted">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-gold" />
        <p>
          Report only: this page has no delete or cleanup action. Review archived
          products, disabled banners, and historical order snapshots before any
          separate manual Storage decision. Blank persisted values are listed as
          invalid references rather than silently ignored.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(([label, value]) => (
          <div key={label} className="border border-line bg-card p-4">
            <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
            <p className="mt-2 font-display text-2xl text-ivory">{value}</p>
          </div>
        ))}
      </div>

      {report.rows.length === 0 ? (
        <EmptyState
          icon={<Images size={32} strokeWidth={1.5} />}
          title="No media found"
          description="The product-images bucket and all persisted media references are empty."
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            Showing {displayedRows.length} of {report.rows.length} unique entries.
            The CSV contains the complete report.
          </p>
          <div className="overflow-x-auto border border-line bg-card">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Object / reference</th>
                  <th className="px-4 py-3 font-medium">References</th>
                  <th className="px-4 py-3 text-right font-medium">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {displayedRows.map((row) => (
                  <tr
                    key={`${row.status}:${row.objectPath ?? row.value}`}
                    className="align-top"
                  >
                    <td className="px-4 py-4">
                      <Badge tone={statusTone(row.status)}>
                        {STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="max-w-[420px] px-4 py-4">
                      <p className="break-all font-mono text-xs text-ivory">
                        {row.objectPath ??
                          (row.value.trim() ? row.value : "(blank reference)")}
                      </p>
                      {row.objectPath && row.value !== row.objectPath && (
                        <p className="mt-1 break-all text-xs text-muted">
                          {row.value}
                        </p>
                      )}
                    </td>
                    <td className="max-w-[340px] px-4 py-4">
                      <p className="text-ivory">
                        {row.referenceCount} use{row.referenceCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted">
                        {sourceSummary(row)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-muted">
                      {formatBytes(row.bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
