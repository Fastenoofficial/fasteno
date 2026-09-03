"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function toggleFeatured(productId: string, featured: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ featured })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/featured");
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function updateFeaturedOrder(productId: string, order: number) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ featured_order: order })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/featured");
  revalidatePath("/");
}

export async function bulkFeature(productIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  // Get current max featured_order
  const { data: maxData } = await supabase
    .from("products")
    .select("featured_order")
    .eq("featured", true)
    .order("featured_order", { ascending: false })
    .limit(1);

  const startOrder = maxData && maxData[0] ? maxData[0].featured_order + 1 : 0;

  // Update products to be featured with sequential order
  const updates = productIds.map((id, index) =>
    supabase
      .from("products")
      .update({ featured: true, featured_order: startOrder + index })
      .eq("id", id)
  );

  await Promise.all(updates);

  revalidatePath("/admin/featured");
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function bulkUnfeature(productIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const updates = productIds.map((id) =>
    supabase
      .from("products")
      .update({ featured: false, featured_order: 0 })
      .eq("id", id)
  );

  await Promise.all(updates);

  revalidatePath("/admin/featured");
  revalidatePath("/admin/products");
  revalidatePath("/");
}
