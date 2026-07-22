"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveRequest,
  completeRequest,
  rejectRequest,
} from "@/components/admin/request-actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

/** One row of /admin/requests. Requested rows get two-step Approve /
 *  Reject (with an optional admin note); approved rows get a two-step
 *  Complete (return → refund guidance, replace → manual-shipment note). */

export interface AdminRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  email: string;
  type: "cancel" | "return" | "replace";
  reason: string;
  status: "requested" | "approved" | "rejected" | "completed";
  adminNote: string | null;
  createdAt: string;
  /** Pre-formatted age ("3d ago") — computed server-side for stable SSR. */
  age: string;
  resolvedAt: string | null;
}

const STATUS_TONES: Record<
  AdminRequest["status"],
  "gold" | "muted" | "success" | "danger"
> = {
  requested: "gold",
  approved: "muted",
  rejected: "danger",
  completed: "success",
};

const TYPE_TONES: Record<
  AdminRequest["type"],
  "gold" | "muted" | "success" | "danger"
> = {
  cancel: "danger",
  return: "gold",
  replace: "muted",
};

type Armed = "approve" | "reject" | "complete" | null;

export function RequestRow({ request }: { request: AdminRequest }) {
  const router = useRouter();
  const [armed, setArmed] = useState<Armed>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string; ok?: boolean }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        setArmed(null);
        return;
      }
      setArmed(null);
      setNote("");
      setError(null);
      router.refresh();
    });
  }

  function handle(kind: Exclude<Armed, null>) {
    if (armed !== kind) {
      setArmed(kind);
      setError(null);
      return;
    }
    if (kind === "approve") run(() => approveRequest(request.id, note));
    else if (kind === "reject") run(() => rejectRequest(request.id, note));
    else run(() => completeRequest(request.id));
  }

  return (
    <tr className="align-top transition-colors hover:bg-surface">
      <td className="px-4 py-3">
        <Link
          href={`/admin/orders/${request.orderId}`}
          className="text-ivory transition-colors hover:text-gold"
        >
          {request.orderNumber}
        </Link>
        <p className="text-xs text-muted">
          {formatDate(request.createdAt)} · {request.age}
        </p>
      </td>
      <td className="max-w-[180px] truncate px-4 py-3 text-muted">
        {request.email}
      </td>
      <td className="px-4 py-3">
        <Badge tone={TYPE_TONES[request.type]}>{request.type}</Badge>
      </td>
      <td className="max-w-[220px] px-4 py-3">
        <p className="truncate text-muted" title={request.reason}>
          {request.reason || "—"}
        </p>
        {request.adminNote && (
          <p
            className="mt-1 truncate text-xs text-muted/80"
            title={request.adminNote}
          >
            Note: {request.adminNote}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={STATUS_TONES[request.status]}>{request.status}</Badge>
      </td>
      <td className="px-4 py-3">
        {request.status === "requested" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => handle("approve")}
              >
                {pending && armed === "approve"
                  ? "Approving…"
                  : armed === "approve"
                    ? "Confirm approve?"
                    : "Approve"}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => handle("reject")}
              >
                {pending && armed === "reject"
                  ? "Rejecting…"
                  : armed === "reject"
                    ? "Confirm reject?"
                    : "Reject"}
              </Button>
              {armed && !pending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setArmed(null)}
                >
                  Cancel
                </Button>
              )}
            </div>
            {armed && !pending && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Admin note (optional)"
                maxLength={500}
                className="w-48 border-0 border-b border-line bg-transparent px-0 py-1 text-xs text-ivory placeholder:text-muted/60 focus:border-ivory focus:outline-none"
              />
            )}
          </div>
        )}
        {request.status === "approved" && (
          <div className="max-w-[240px] space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => handle("complete")}
              >
                {pending
                  ? "Completing…"
                  : armed === "complete"
                    ? "Confirm complete?"
                    : "Complete"}
              </Button>
              {armed === "complete" && !pending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setArmed(null)}
                >
                  Cancel
                </Button>
              )}
            </div>
            <p className="text-xs text-muted">
              {request.type === "return"
                ? "Arrange the reverse pickup first — Complete then refunds the payment and restores stock."
                : request.type === "replace"
                  ? "Complete marks it done; ship the replacement manually from the order screen."
                  : "Complete cancels the order (refunding it if paid) and restores stock."}
            </p>
          </div>
        )}
        {(request.status === "rejected" ||
          request.status === "completed") && (
          <p className="text-xs text-muted">
            Resolved{" "}
            {request.resolvedAt ? formatDate(request.resolvedAt) : "—"}
          </p>
        )}
        {error && <p className="mt-2 max-w-[240px] text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
