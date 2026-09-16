"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidateFeaturedProducts() {
  revalidatePath("/admin/featured");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

function redirectFeaturedError(message: string): never {
  redirect(`/admin/featured?error=${encodeURIComponent(message)}`);
}

export async function setProductsFeatured(
  productIds: string[],
  featured: boolean,
) {
  await requireAdmin();
  if (
    !Array.isArray(productIds) ||
    productIds.length === 0 ||
    productIds.some((id) => !UUID.test(id)) ||
    new Set(productIds).size !== productIds.length ||
    typeof featured !== "boolean"
  ) {
    throw new Error("Featured product update is invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_products_featured", {
    p_product_ids: productIds,
    p_featured: featured,
  });
  if (error) {
    console.error("featured action: membership update failed —", error.message);
    throw new Error("Featured products could not be updated. Please try again.");
  }

  revalidateFeaturedProducts();
}

export async function toggleFeatured(productId: string, featured: boolean) {
  await setProductsFeatured([productId], featured);
}

export async function moveFeaturedProduct(id: string, direction: -1 | 1) {
  await requireAdmin();
  if (!UUID.test(id) || (direction !== -1 && direction !== 1)) {
    redirectFeaturedError("Featured product move is invalid.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_featured_product", {
    p_product_id: id,
    p_direction: direction,
  });
  if (error) {
    console.error("featured action: reorder failed —", error.message);
    redirectFeaturedError(
      "Featured ordering could not be saved. Refresh and try again.",
    );
  }

  revalidateFeaturedProducts();
  redirect("/admin/featured?moved=true");
}

export async function unfeatureFeaturedProduct(id: string) {
  try {
    await setProductsFeatured([id], false);
  } catch (error) {
    console.error(
      "featured action: unfeature failed —",
      error instanceof Error ? error.message : error,
    );
    redirectFeaturedError("Unable to unfeature that product. Please try again.");
  }
  redirect("/admin/featured?updated=true");
}
