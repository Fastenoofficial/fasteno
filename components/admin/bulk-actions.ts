"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { MAX_ADMIN_BULK_PRODUCTS } from "@/lib/admin-constants";
import { createClient } from "@/lib/supabase/server";

type ProductOperation =
  | "archive"
  | "activate"
  | "deactivate"
  | "feature"
  | "unfeature"
  | "category_change";

interface OperationRow {
  product_id: string;
  product_slug: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validSelection(productIds: string[]): boolean {
  return (
    Array.isArray(productIds) &&
    productIds.length > 0 &&
    productIds.length <= MAX_ADMIN_BULK_PRODUCTS &&
    productIds.every((id) => UUID_PATTERN.test(id)) &&
    new Set(productIds).size === productIds.length
  );
}

async function applyProductOperation(
  productIds: string[],
  operation: ProductOperation,
  errorMessage: string,
  categoryId: string | null = null,
): Promise<OperationRow[]> {
  await requireAdmin();

  if (!validSelection(productIds)) {
    redirect(
      `/admin/products?error=${encodeURIComponent(
        `Select between 1 and ${MAX_ADMIN_BULK_PRODUCTS} valid, unique products.`,
      )}`,
    );
  }
  if (operation === "category_change" && (!categoryId || !UUID_PATTERN.test(categoryId))) {
    redirect(
      `/admin/products?error=${encodeURIComponent("Choose a valid destination category.")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_manage_products", {
    p_product_ids: productIds,
    p_operation: operation,
    p_category_id: categoryId,
  });
  const rows = (data ?? []) as OperationRow[];

  if (error || rows.length !== productIds.length) {
    redirect(`/admin/products?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/featured");
  revalidatePath("/admin/activity");
  revalidatePath("/shop");
  revalidatePath("/");
  for (const row of rows) revalidatePath(`/product/${row.product_slug}`);

  return rows;
}

export async function bulkArchiveProducts(productIds: string[]) {
  const rows = await applyProductOperation(
    productIds,
    "archive",
    "Unable to archive the selected products.",
  );
  redirect(`/admin/products?archived=${rows.length}`);
}

export async function bulkActivateProducts(productIds: string[]) {
  const rows = await applyProductOperation(
    productIds,
    "activate",
    "Unable to activate the selected products.",
  );
  redirect(`/admin/products?activated=${rows.length}`);
}

export async function bulkDeactivateProducts(productIds: string[]) {
  const rows = await applyProductOperation(
    productIds,
    "deactivate",
    "Unable to deactivate the selected products.",
  );
  redirect(`/admin/products?deactivated=${rows.length}`);
}

export async function bulkFeatureProducts(productIds: string[]) {
  const rows = await applyProductOperation(
    productIds,
    "feature",
    "Unable to feature the selected active products.",
  );
  redirect(`/admin/products?featured=${rows.length}`);
}

export async function bulkUnfeatureProducts(productIds: string[]) {
  const rows = await applyProductOperation(
    productIds,
    "unfeature",
    "Unable to unfeature the selected products.",
  );
  redirect(`/admin/products?unfeatured=${rows.length}`);
}

export async function bulkChangeCategoryProducts(
  productIds: string[],
  categoryId: string,
) {
  const rows = await applyProductOperation(
    productIds,
    "category_change",
    "Unable to change the category for the selected products.",
    categoryId,
  );
  redirect(`/admin/products?categorized=${rows.length}`);
}
