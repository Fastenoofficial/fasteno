"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { getProductsByIds } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/** Server actions for the account area. Every mutating action re-checks
 *  auth server-side (never trust the client). */

export interface ActionResult {
  error?: string;
  ok?: boolean;
}

// ── Wishlist (works in demo AND live mode) ────────────────────────────

/** Resolve wishlist product ids (from localStorage via useCart) into full
 *  products. Read-only; safe to call signed-out and in demo mode. */
export async function fetchWishlistProducts(ids: string[]): Promise<Product[]> {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const unique = Array.from(
    new Set(ids.filter((id): id is string => typeof id === "string")),
  ).slice(0, 100);
  const products = await getProductsByIds(unique);
  // keep the order items were wishlisted in
  return [...products].sort(
    (a, b) => unique.indexOf(a.id) - unique.indexOf(b.id),
  );
}

// ── Session ───────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

// ── Profile ───────────────────────────────────────────────────────────

export async function updateProfile(input: {
  fullName: string;
  phone: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured)
    return { error: "Accounts are disabled in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  if (!fullName) return { error: "Please enter your name." };
  if (phone && !/^[0-9+\-\s]{8,15}$/.test(phone))
    return { error: "Please enter a valid phone number." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);
  if (error) return { error: "Could not save your profile. Try again." };

  revalidatePath("/account");
  return { ok: true };
}

// ── Addresses ─────────────────────────────────────────────────────────

export interface AddressInput {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

function validateAddress(a: AddressInput): string | null {
  if (!a.name.trim()) return "Please enter a name.";
  if (!/^[0-9+\-\s]{8,15}$/.test(a.phone.trim()))
    return "Please enter a valid phone number.";
  if (!a.line1.trim()) return "Please enter the address line.";
  if (!a.city.trim()) return "Please enter the city.";
  if (!a.state.trim()) return "Please enter the state.";
  if (!/^[1-9][0-9]{5}$/.test(a.pincode.trim()))
    return "Please enter a valid 6-digit PIN code.";
  return null;
}

export async function saveAddress(
  input: AddressInput,
  id?: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured)
    return { error: "Accounts are disabled in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const invalid = validateAddress(input);
  if (invalid) return { error: invalid };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Only one default address at a time.
  if (input.isDefault) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  const row = {
    user_id: user.id,
    name: input.name.trim(),
    phone: input.phone.trim(),
    line1: input.line1.trim(),
    line2: input.line2.trim() || null,
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    is_default: input.isDefault,
  };

  const { error } = id
    ? await supabase
        .from("addresses")
        .update(row)
        .eq("id", id)
        .eq("user_id", user.id)
    : await supabase.from("addresses").insert(row);
  if (error) return { error: "Could not save the address. Try again." };

  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured)
    return { error: "Accounts are disabled in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Could not delete the address." };

  revalidatePath("/account/addresses");
  return { ok: true };
}

// ── Order self-service requests (cancel / return / replace) ───────────

export type OrderRequestType = "cancel" | "return" | "replace";

/** Order statuses a customer may still cancel from (pre-shipment). */
const CANCELLABLE_STATUSES = ["pending", "confirmed"];

/** Customer-facing request flow.
 *  - cancel: instant self-service (industry norm) — refunds paid orders via
 *    refundOrder(), otherwise cancels + restores stock; the request row is
 *    marked completed. If instant execution fails the row stays "requested"
 *    and surfaces on /admin/requests for manual handling.
 *  - return / replace: recorded as "requested" and admin-gated.
 *  One request per order; RLS additionally enforces owner-only inserts. */
export async function submitOrderRequest(input: {
  orderId: string;
  type: OrderRequestType;
  reason: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured)
    return { error: "Order requests are disabled in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const type = input.type;
  if (type !== "cancel" && type !== "return" && type !== "replace")
    return { error: "Unknown request type." };
  const reason = (input.reason ?? "").trim().slice(0, 500);
  if (type !== "cancel" && !reason)
    return { error: "Please tell us the reason for your request." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Own order only (RLS already hides other users' orders from this read).
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, payment_status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (!order || order.user_id !== user.id) return { error: "Order not found." };

  if (type === "cancel" && !CANCELLABLE_STATUSES.includes(order.status))
    return {
      error:
        "This order can no longer be cancelled — it is already on its way.",
    };
  if (type !== "cancel" && order.status !== "delivered")
    return {
      error:
        "Returns and replacements open up once the order is delivered.",
    };

  // One request per order — the UI hides the buttons once one exists.
  const { data: existing } = await supabase
    .from("order_requests")
    .select("id")
    .eq("order_id", order.id)
    .limit(1);
  if (existing && existing.length > 0)
    return { error: "A request already exists for this order." };

  const { data: request, error: insertError } = await supabase
    .from("order_requests")
    .insert({ order_id: order.id, user_id: user.id, type, reason })
    .select("id")
    .single();
  if (insertError || !request)
    return { error: "Could not submit the request. Please try again." };

  if (type === "cancel") {
    try {
      if (order.payment_status === "paid") {
        // Razorpay refund (or COD bookkeeping) + cancel + stock restore.
        const { refundOrder } = await import("@/lib/razorpay");
        await refundOrder(order.id);
      } else {
        // Unpaid: cancel the order and return the reserved stock. Orders
        // UPDATE is admin-only under RLS, so this needs the service client.
        const { createServiceClient } = await import("@/lib/supabase/service");
        const service = createServiceClient();
        if (!service)
          throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY not set — cannot cancel instantly.",
          );
        const { data: flipped, error: cancelError } = await service
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", order.id)
          .in("status", CANCELLABLE_STATUSES)
          .select("id");
        if (cancelError) throw new Error(cancelError.message);
        // Restore stock ONLY when this call actually did the flip — a
        // concurrent admin cancel/reap already restored it otherwise.
        const didCancel = (flipped ?? []).length > 0;
        if (!didCancel) throw new Error("Order state changed — please refresh.");

        // Skip restore for failed payments — the payment-failed handler
        // already returned that stock.
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

      // Close the loop on the request (owner cannot update under RLS).
      const { createServiceClient } = await import("@/lib/supabase/service");
      const service = createServiceClient();
      if (service) {
        await service
          .from("order_requests")
          .update({
            status: "completed",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", request.id);
      }
    } catch (err) {
      // Leave the row as "requested" — it lands on /admin/requests for a
      // human to finish. The customer still sees a submitted request.
      console.error("orders: instant cancel failed —", err);
    }
  }

  revalidatePath("/account/orders");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured)
    return { error: "Accounts are disabled in demo mode." };
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);
  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Could not update the default address." };

  revalidatePath("/account/addresses");
  return { ok: true };
}
