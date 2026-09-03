"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  display_on_home: boolean;
  image_url?: string;
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;
  const display_on_home = formData.get("display_on_home") === "on";
  const image_url = formData.get("image_url") as string;

  if (!name || !slug) {
    redirect("/admin/categories/new?error=Name and slug are required");
  }

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    description,
    sort_order,
    display_on_home,
    image_url: image_url || null,
  });

  if (error) {
    redirect(`/admin/categories/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/categories?created=true");
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;
  const display_on_home = formData.get("display_on_home") === "on";
  const image_url = formData.get("image_url") as string;

  if (!name || !slug) {
    redirect(`/admin/categories/${id}?error=Name and slug are required`);
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      description,
      sort_order,
      display_on_home,
      image_url: image_url || null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/categories/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/categories?updated=true");
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  // Check if category has products
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    redirect(
      `/admin/categories?error=${encodeURIComponent(`Cannot delete category with ${count} products. Reassign products first.`)}`
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
  redirect("/admin/categories?deleted=true");
}

export async function reorderCategories(categoryIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  // Update sort_order for each category
  const updates = categoryIds.map((id, index) =>
    supabase.from("categories").update({ sort_order: index }).eq("id", id)
  );

  await Promise.all(updates);

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
}
