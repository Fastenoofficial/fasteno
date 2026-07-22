"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { getProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

/** Admin server actions for order self-service requests (cancel / return /
 *  replace). Kept separate from components/admin/actions.ts on purpose —
 *  that file belongs to another workstream this round.
 *
 *  Every action re-verifies the admin role, then works through the
 *  service-role client (order_requests updates and orders updates are
 *  admin/service territory under RLS). */

export interface RequestActionResult {
  error?: string;
  ok?: boolean;
}

/** Local admin re-check — same contract as the assertAdmin in
 *  components/admin/actions.ts, reimplemented here to keep file ownership
 *  clean. */
async function assertAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured) return "Admin is disabled in demo mode.";
  const profile = await getProfile();
  if (!profile || profile.role !== "admin")
    return "You need admin access for this.";
  return null;
}

function cleanNote(note?: string): string | null {
  const trimmed = (note ?? "").trim().slice(0, 500);
  return trimmed || null;
}

/** Approve a "requested" return/replace (or escalated cancel). The row
 *  moves to "approved"; fulfilment happens via completeRequest. */
export async function approveRequest(
  requestId: string,
  adminNote?: string,
): Promise<RequestActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  const service = createServiceClient();
  if (!service)
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set — cannot update requests." };

  const { data, error } = await service
    .from("order_requests")
    .update({ status: "approved", admin_note: cleanNote(adminNote) })
    .eq("id", requestId)
    .eq("status", "requested")
    .select("id");
  if (error) return { error: "Could not approve the request." };
  if (!data || data.length === 0)
    return { error: "Only rows still in “requested” can be approved." };

  revalidatePath("/admin/requests");
  return { ok: true };
}

/** Reject a "requested" row (with an optional customer-invisible note). */
export async function rejectRequest(
  requestId: string,
  adminNote?: string,
): Promise<RequestActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  const service = createServiceClient();
  if (!service)
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set — cannot update requests." };

  const { data, error } = await service
    .from("order_requests")
    .update({
      status: "rejected",
      admin_note: cleanNote(adminNote),
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "requested")
    .select("id");
  if (error) return { error: "Could not reject the request." };
  if (!data || data.length === 0)
    return { error: "Only rows still in “requested” can be rejected." };

  revalidatePath("/admin/requests");
  return { ok: true };
}

/** Complete an approved request:
 *  - return  → refundOrder(orderId) (gateway refund / COD bookkeeping,
 *              cancels the order and restores stock), then mark completed.
 *  - replace → bookkeeping only; the admin ships the replacement manually
 *              from the order screen.
 *  - cancel  → an instant self-service cancel that failed and escalated
 *              here: paid → refundOrder; unpaid → cancel + restore stock. */
export async function completeRequest(
  requestId: string,
): Promise<RequestActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  const service = createServiceClient();
  if (!service)
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not set — cannot update requests." };

  const { data: request, error } = await service
    .from("order_requests")
    .select("id, order_id, type, status")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !request) return { error: "Request not found." };
  if (request.status !== "approved")
    return { error: "Approve the request before completing it." };

  try {
    if (request.type === "return") {
      const { refundOrder } = await import("@/lib/razorpay");
      await refundOrder(request.order_id as string);
    } else if (request.type === "cancel") {
      const { data: order } = await service
        .from("orders")
        .select("id, status, payment_status")
        .eq("id", request.order_id)
        .maybeSingle();
      if (!order) throw new Error("Order not found for this request.");
      if (order.payment_status === "paid") {
        const { refundOrder } = await import("@/lib/razorpay");
        await refundOrder(order.id as string);
      } else if (order.status !== "cancelled") {
        const { error: cancelError } = await service
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id);
        if (cancelError) throw new Error(cancelError.message);
        // Failed payments already had their stock restored by the
        // payment-failed handler — don't restore twice.
        if (order.payment_status !== "failed") {
          const { data: itemRows } = await service
            .from("order_items")
            .select("product_id, quantity")
            .eq("order_id", order.id);
          const { restoreStock } = await import("@/lib/orders");
          await restoreStock(
            (itemRows ?? [])
              .filter((i) => i.product_id)
              .map((i) => ({
                productId: i.product_id as string,
                quantity: i.quantity as number,
                name: "",
                price: 0,
                image: "",
              })),
          );
        }
      }
    }
    // replace: nothing to execute here.
  } catch (err) {
    console.error("requests: complete failed —", err);
    return {
      error:
        err instanceof Error && err.message
          ? err.message
          : "Could not complete the request.",
    };
  }

  const { error: updateError } = await service
    .from("order_requests")
    .update({ status: "completed", resolved_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError)
    return {
      error:
        "The action went through but the request could not be marked completed. Refresh and retry.",
    };

  revalidatePath("/admin/requests");
  revalidatePath("/admin/orders");
  return { ok: true };
}
