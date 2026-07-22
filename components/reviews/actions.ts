"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser, getProfile } from "@/lib/auth";

/** Review server actions — customer submission + admin moderation.
 *  Every action re-verifies auth server-side; RLS enforces the same rules
 *  in the database (owner insert, admin update). */

export interface ReviewActionResult {
  ok?: boolean;
  error?: string;
}

export interface ReviewFormInput {
  productSlug: string;
  rating: number;
  title: string;
  body: string;
}

// ── Customer: submit a review (lands as status "pending") ─────────────

export async function submitReview(
  input: ReviewFormInput,
): Promise<ReviewActionResult> {
  if (!isSupabaseConfigured)
    return {
      error:
        "Reviews are disabled in demo mode — connect a Supabase project to enable them.",
    };

  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to write a review." };

  const rating = Math.round(Number(input.rating));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: "Please choose a star rating." };
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 2000);
  if (!title) return { error: "Please add a short title for your review." };
  if (body.length < 10)
    return { error: "Please write a few words about the piece." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  // Resolve the product server-side — never trust a client-supplied id.
  const slug = input.productSlug.trim();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  if (!product) return { error: "This product could not be found." };

  // Author name from the profile; fall back to a friendly default.
  const profile = await getProfile(user.id);
  const authorName = profile?.fullName?.trim() || "Customer";

  // Verified purchase: one of their orders contains this product.
  const verified = await hasPurchased(user.id, product.id as string);

  const { error } = await supabase.from("reviews").insert({
    product_id: product.id,
    user_id: user.id,
    author_name: authorName,
    rating,
    title,
    body,
    verified,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505")
      return {
        error: "You have already reviewed this piece — thank you!",
      };
    return { error: "Your review could not be submitted. Please try again." };
  }

  revalidatePath(`/product/${slug}`);
  return { ok: true };
}

/** True when any order row of this user contains the product. Prefers the
 *  service client (sees guest-converted rows too); falls back to the
 *  session client (RLS: owner-readable orders). Never blocks a review. */
async function hasPurchased(
  userId: string,
  productId: string,
): Promise<boolean> {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const service = createServiceClient();
    if (service) {
      const { data } = await service
        .from("order_items")
        .select("id, orders!inner(user_id)")
        .eq("product_id", productId)
        .eq("orders.user_id", userId)
        .limit(1);
      return (data?.length ?? 0) > 0;
    }
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("orders")
      .select("id, order_items!inner(product_id)")
      .eq("user_id", userId)
      .eq("order_items.product_id", productId)
      .limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// ── Admin: moderation ─────────────────────────────────────────────────

async function assertAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured) return "Admin is disabled in demo mode.";
  const profile = await getProfile();
  if (!profile || profile.role !== "admin")
    return "You need admin access for this.";
  return null;
}

/** Revalidate the moderation queue + the PDP the review belongs to. */
async function revalidateReviewPaths(reviewId: string): Promise<void> {
  revalidatePath("/admin/reviews");
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("reviews")
      .select("products(slug)")
      .eq("id", reviewId)
      .single();
    const joined = (
      data as {
        products?: { slug: string } | { slug: string }[] | null;
      } | null
    )?.products;
    const slug = Array.isArray(joined) ? joined[0]?.slug : joined?.slug;
    if (slug) revalidatePath(`/product/${slug}`);
  } catch {
    // path revalidation is best-effort — the moderation change stands
  }
}

export async function moderateReview(
  reviewId: string,
  status: "approved" | "rejected",
): Promise<ReviewActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };
  if (status !== "approved" && status !== "rejected")
    return { error: "Unknown moderation status." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", reviewId);
  if (error) return { error: "Could not update the review." };

  await revalidateReviewPaths(reviewId);
  return { ok: true };
}

export async function replyToReview(
  reviewId: string,
  reply: string,
): Promise<ReviewActionResult> {
  const denied = await assertAdmin();
  if (denied) return { error: denied };

  const text = reply.trim().slice(0, 1000);
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("reviews")
    .update({ admin_reply: text || null })
    .eq("id", reviewId);
  if (error) return { error: "Could not save the reply." };

  await revalidateReviewPaths(reviewId);
  return { ok: true };
}
