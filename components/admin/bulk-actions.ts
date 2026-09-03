"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function bulkDeleteProducts(productIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .delete()
    .in("id", productIds);

  if (error) {
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect(`/admin/products?deleted=${productIds.length}`);
}

export async function bulkActivateProducts(productIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ active: true })
    .in("id", productIds);

  if (error) {
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect(`/admin/products?activated=${productIds.length}`);
}

export async function bulkDeactivateProducts(productIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .in("id", productIds);

  if (error) {
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect(`/admin/products?deactivated=${productIds.length}`);
}

export async function bulkFeatureProducts(productIds: string[]) {
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

  const { error } = await supabase
    .from("products")
    .update({ featured: true })
    .in("id", productIds);

  // Update featured_order for each product
  const updates = productIds.map((id, index) =>
    supabase
      .from("products")
      .update({ featured_order: startOrder + index })
      .eq("id", id)
  );

  await Promise.all(updates);

  if (error) {
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/featured");
  revalidatePath("/");
  redirect(`/admin/products?featured=${productIds.length}`);
}

export async function bulkUnfeatureProducts(productIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ featured: false, featured_order: 0 })
    .in("id", productIds);

  if (error) {
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/featured");
  revalidatePath("/");
  redirect(`/admin/products?unfeatured=${productIds.length}`);
}

export async function bulkChangeCategoryProducts(
  productIds: string[],
  categoryId: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({ category_id: categoryId })
    .in("id", productIds);

  if (error) {
    redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect(`/admin/products?categorized=${productIds.length}`);
}
