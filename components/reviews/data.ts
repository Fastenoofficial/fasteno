import { isSupabaseConfigured } from "@/lib/config";

/** Reviews data layer — SERVER ONLY (uses the cookie-bound Supabase
 *  client). Demo mode returns empty data so the PDP renders gracefully
 *  without a database. RLS decides visibility: everyone sees approved
 *  reviews, a signed-in user additionally sees their own rows. */

export interface ProductRating {
  count: number;
  average: number;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  status: ReviewStatus;
  adminReply: string | null;
  createdAt: string;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

export function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    authorName: row.author_name || "Customer",
    rating: row.rating,
    title: row.title,
    body: row.body,
    verified: row.verified,
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "pending",
    adminReply: row.admin_reply,
    createdAt: row.created_at,
  };
}

/** Approved-review aggregate via the product_rating(p_product_id) RPC.
 *  Fetched ONCE per PDP render and shared by the JSON-LD + reviews header. */
export async function getProductRating(
  productId: string,
): Promise<ProductRating> {
  if (!isSupabaseConfigured) return { count: 0, average: 0 };
  const { createPublicClient } = await import("@/lib/supabase/server");
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("product_rating", {
    p_product_id: productId,
  });
  if (error || !data) return { count: 0, average: 0 };
  const d = data as { count?: number | null; average?: number | null };
  return { count: Number(d.count ?? 0), average: Number(d.average ?? 0) };
}

/** Reviews visible to the current request, newest first (approved for
 *  everyone + the signed-in user's own row, enforced by RLS). */
export async function getProductReviews(
  productId: string,
): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];
  const { createPublicClient } = await import("@/lib/supabase/server");
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, product_id, user_id, author_name, rating, title, body, verified, status, admin_reply, created_at",
    )
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ReviewRow[]).map(mapReviewRow);
}
